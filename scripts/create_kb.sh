#!/usr/bin/env bash
# Curate data sources for the existing DigitalOcean genetics-literacy-kb.
#
# Safe by default: --list is offline, --check is read-only, and mutation requires
# --create, --apply-web, --upload-pdfs, or --index.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE="https://api.digitalocean.com/v2/gen-ai"
KB_NAME="${KB_NAME:-genetics-literacy-kb}"
DOWNLOAD_DIR="${KB_DOWNLOAD_DIR:-$ROOT_DIR/data/kb_sources/downloads}"
KB_REGION="${KB_REGION:-tor1}"
KB_EMBEDDING_MODEL_UUID="${KB_EMBEDDING_MODEL_UUID:-22653204-79ed-11ef-bf8f-4e013e2ddde4}"

# label|URL — all use section-based chunking for clean HTML full text.
WEB_SOURCES=(
  "1000 Genomes global reference|https://europepmc.org/articles/PMC4750478"
  "Diversity gap and research ethics|https://europepmc.org/articles/PMC11770215"
  "Ancestrally matched Thai imputation|https://europepmc.org/articles/PMC10390539"
  "GenomeAsia 100K pilot|https://europepmc.org/articles/PMC7054211"
  "Sub-Saharan African panel evaluation|https://www.sciencedirect.com/science/article/pii/S2666979X23001003"
  "African-American reference panel|https://europepmc.org/articles/PMC8571350"
  "East Asian 14393-genome panel|https://europepmc.org/articles/PMC10411914"
  "Native American imputation panel|https://europepmc.org/articles/PMC8762266"
  "Qatar Genome Arab haplotype panel|https://europepmc.org/articles/PMC8511259"
  "GLAD admixed Latin American resource|https://europepmc.org/articles/PMC11605695"
)

# filename|label|URL — stage these for console file upload with semantic chunks.
PDF_SOURCES=(
  "disease-gene-population-differentiation-preprint.pdf|Disease-gene population differentiation preprint|https://www.biorxiv.org/content/10.64898/2026.01.02.697354.full.pdf"
  "global-imputation-accuracy-preprint.pdf|Imputation accuracy across 123 populations|https://www.biorxiv.org/content/10.1101/2023.05.22.541241.full.pdf"
)

usage() {
  cat <<'EOF'
Usage: scripts/create_kb.sh [--list|--check|--create|--download-pdfs|--apply-web|--upload-pdfs|--index|--status|--attach]

  --list            Print the curated manifest without network calls (default).
  --check           Verify genetics-literacy-kb and its managed database wiring.
  --create          Idempotently create the KB and managed OpenSearch database.
  --download-pdfs   Download the two PDF file sources into the ignored staging directory.
  --apply-web       Add missing web-crawler data sources through the DO API.
  --upload-pdfs     Idempotently upload staged PDFs without logging presigned URLs.
  --index           Start an indexing job for every source in the named KB.
  --status          Show the latest indexing job without exposing source content.
  --attach          Attach the KB to the agent matching GRADIENT_AGENT_ENDPOINT.

Run --index after adding sources, then wait for it to complete before testing RAG.
--create provisions the intended managed OpenSearch database
when the named KB is absent; every external mutation remains explicitly opt-in.
EOF
}

load_env() {
  if [[ -f "$ROOT_DIR/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT_DIR/.env"
    set +a
  fi
}

require_control_plane() {
  load_env
  : "${DIGITALOCEAN_TOKEN:?Set DIGITALOCEAN_TOKEN in .env or the environment}"
  command -v curl >/dev/null || { echo "curl is required" >&2; exit 1; }
  command -v python3 >/dev/null || { echo "python3 is required" >&2; exit 1; }
}

list_sources() {
  echo "Web crawler sources (section-based chunking):"
  local entry label url
  for entry in "${WEB_SOURCES[@]}"; do
    IFS='|' read -r label url <<<"$entry"
    printf '  - %s\n    %s\n' "$label" "$url"
  done

  echo "PDF file sources (semantic chunking; manual console upload):"
  local filename
  for entry in "${PDF_SOURCES[@]}"; do
    IFS='|' read -r filename label url <<<"$entry"
    printf '  - %s -> %s\n    %s\n' "$label" "$filename" "$url"
  done
}

find_kb() {
  local response
  response="$(curl --silent --show-error \
    -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
    -H "Accept: application/json" \
    "$API_BASE/knowledge_bases?per_page=200")"

  printf '%s' "$response" | python3 -c '
import json
import sys

name = sys.argv[1]
payload = json.load(sys.stdin)
matches = [kb for kb in payload.get("knowledge_bases", []) if kb.get("name") == name]
if not matches:
    raise SystemExit(f"Knowledge base {name!r} was not found; create/select it in the DO console first.")
kb = matches[0]
database_id = kb.get("database_id") or (kb.get("database") or {}).get("uuid")
if not database_id:
    raise SystemExit(f"Knowledge base {name!r} has no managed OpenSearch database_id.")
uuid = kb.get("uuid", "")
print(uuid + "\t" + database_id)
' "$KB_NAME"
}

kb_exists() {
  local response
  response="$(curl --fail --silent --show-error \
    -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
    -H "Accept: application/json" \
    "$API_BASE/knowledge_bases?per_page=200")"
  printf '%s' "$response" | python3 -c '
import json
import sys

name = sys.argv[1]
matches = [kb for kb in json.load(sys.stdin).get("knowledge_bases", []) if kb.get("name") == name]
raise SystemExit(0 if matches else 1)
' "$KB_NAME"
}

check_kb() {
  local kb_uuid database_id
  IFS=$'\t' read -r kb_uuid database_id < <(find_kb)
  [[ -n "$kb_uuid" ]] || { echo "Knowledge base UUID is missing" >&2; exit 1; }
  echo "PASS: $KB_NAME exists and is backed by a DO Managed OpenSearch database."
  echo "Knowledge base UUID: $kb_uuid"
  echo "Database wiring: present (identifier intentionally not printed)"
}

default_project_id() {
  if [[ -n "${KB_PROJECT_ID:-}" ]]; then
    printf '%s\n' "$KB_PROJECT_ID"
    return
  fi
  local response
  response="$(curl --fail --silent --show-error \
    -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
    -H "Accept: application/json" \
    "https://api.digitalocean.com/v2/projects?per_page=200")"
  printf '%s' "$response" | python3 -c '
import json
import sys

projects = json.load(sys.stdin).get("projects", [])
defaults = [project for project in projects if project.get("is_default")]
selected = defaults[0] if len(defaults) == 1 else (projects[0] if len(projects) == 1 else None)
if selected is None or not selected.get("id"):
    raise SystemExit("Set KB_PROJECT_ID because a single default project could not be selected safely.")
print(selected["id"])
'
}

create_kb() {
  local project_id first_entry first_label first_url payload response
  if kb_exists; then
    echo "SKIP: $KB_NAME already exists; no duplicate resource created."
    check_kb || echo "The existing KB is still provisioning its managed database."
    return
  fi

  project_id="$(default_project_id)"
  first_entry="${WEB_SOURCES[0]}"
  IFS='|' read -r first_label first_url <<<"$first_entry"
  payload="$(python3 -c '
import json
import sys
print(json.dumps({
    "name": sys.argv[1],
    "embedding_model_uuid": sys.argv[2],
    "project_id": sys.argv[3],
    "region": sys.argv[4],
    "tags": ["ancestry-audit", "genetics-literacy"],
    "datasources": [{
        "web_crawler_data_source": {
            "base_url": sys.argv[5],
            "crawling_option": "SCOPED",
            "embed_media": False,
            "exclude_tags": ["nav", "footer", "header", "aside", "script", "style", "form", "iframe", "noscript"],
        },
        "chunking_algorithm": "CHUNKING_ALGORITHM_SECTION_BASED",
        "chunking_options": {"max_chunk_size": 500},
    }],
}))
' "$KB_NAME" "$KB_EMBEDDING_MODEL_UUID" "$project_id" "$KB_REGION" "$first_url")"

  echo "Creating $KB_NAME in $KB_REGION with an automatically provisioned managed OpenSearch database."
  echo "Initial source: $first_label"
  response="$(curl --fail --silent --show-error \
    -X POST \
    -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
    -H "Content-Type: application/json" \
    "$API_BASE/knowledge_bases" \
    -d "$payload")"
  printf '%s' "$response" | python3 -c '
import json
import sys

kb = json.load(sys.stdin).get("knowledge_base", {})
if not kb.get("uuid"):
    raise SystemExit("Knowledge Base creation returned no UUID.")
print("CREATED: " + str(kb.get("name", "knowledge base")))
print("Knowledge Base UUID: " + str(kb["uuid"]))
print("Managed OpenSearch: present" if kb.get("database_id") else "Managed OpenSearch: provisioning requested")
'
}

download_pdfs() {
  command -v curl >/dev/null || { echo "curl is required" >&2; exit 1; }
  mkdir -p "$DOWNLOAD_DIR"
  local entry filename label url
  for entry in "${PDF_SOURCES[@]}"; do
    IFS='|' read -r filename label url <<<"$entry"
    echo "Downloading: $label"
    curl --fail --location --silent --show-error "$url" -o "$DOWNLOAD_DIR/$filename"
  done
  echo "Staged PDFs in $DOWNLOAD_DIR"
  echo "Run scripts/create_kb.sh --upload-pdfs, then scripts/create_kb.sh --index."
}

upload_pdfs() {
  [[ -d "$DOWNLOAD_DIR" ]] || { echo "Run --download-pdfs first" >&2; exit 1; }
  python3 "$ROOT_DIR/scripts/upload_kb_pdfs.py" --kb-name "$KB_NAME" --directory "$DOWNLOAD_DIR"
}

start_indexing() {
  local kb_uuid database_id sources payload response entry label url
  IFS=$'\t' read -r kb_uuid database_id < <(find_kb)
  sources="$(curl --fail --silent --show-error \
    -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
    -H "Accept: application/json" \
    "$API_BASE/knowledge_bases/$kb_uuid/data_sources")"
  local manifest_urls=()
  for entry in "${WEB_SOURCES[@]}"; do
    IFS='|' read -r label url <<<"$entry"
    manifest_urls+=("$url")
  done
  payload="$(printf '%s' "$sources" | python3 -c '
import json
import sys
kb_uuid, *urls = sys.argv[1:]
rows = json.load(sys.stdin).get("knowledge_base_data_sources", [])
by_url = {
    (row.get("web_crawler_data_source") or {}).get("base_url"): row.get("uuid")
    for row in rows
}
missing = [url for url in urls if not by_url.get(url)]
if missing:
    raise SystemExit("Apply the current web-source manifest before indexing.")
print(json.dumps({
    "knowledge_base_uuid": kb_uuid,
    "data_source_uuids": [by_url[url] for url in urls],
}))
' "$kb_uuid" "${manifest_urls[@]}")"
  response="$(curl --silent --show-error \
    -X POST \
    -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
    -H "Content-Type: application/json" \
    "$API_BASE/indexing_jobs" \
    -d "$payload")"
  printf '%s' "$response" | python3 -c '
import json
import sys
payload = json.load(sys.stdin)
job = payload.get("job", {})
if not job.get("uuid"):
    message = payload.get("message") or payload.get("error") or "no job UUID"
    raise SystemExit("Indexing request failed: " + str(message)[:300])
print("STARTED: indexing current manifest sources only")
print("Indexing job UUID: " + str(job["uuid"]))
print("Status: " + str(job.get("status", "submitted")))
'
}

indexing_status() {
  local kb_uuid database_id response
  IFS=$'\t' read -r kb_uuid database_id < <(find_kb)
  response="$(curl --fail --silent --show-error \
    -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
    -H "Accept: application/json" \
    "$API_BASE/knowledge_bases/$kb_uuid/indexing_jobs")"
  printf '%s' "$response" | python3 -c '
import json
import sys
jobs = json.load(sys.stdin).get("jobs", [])
if not jobs:
    raise SystemExit("No indexing jobs were found.")
job = jobs[0]
print("Indexing job UUID: " + str(job.get("uuid", "unknown")))
print("Status: " + str(job.get("status", "unknown")))
print("Phase: " + str(job.get("phase", "unknown")))
print("Sources: " + str(job.get("completed_datasources", 0)) + "/" + str(job.get("total_datasources", 0)))
print("Tokens: " + str(job.get("total_tokens") or job.get("tokens") or 0))
'
}

find_agent() {
  : "${GRADIENT_AGENT_ENDPOINT:?Set GRADIENT_AGENT_ENDPOINT to select the deployed agent safely}"
  local response
  response="$(curl --fail --silent --show-error \
    -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
    -H "Accept: application/json" \
    "$API_BASE/agents?per_page=200")"
  printf '%s' "$response" | python3 -c '
import json
import sys
from urllib.parse import urlsplit

target = sys.argv[1].rstrip("/")
target_host = urlsplit(target).netloc
matches = []
for agent in json.load(sys.stdin).get("agents", []):
    deployment = agent.get("deployment") or {}
    url = str(deployment.get("url") or "").rstrip("/")
    if url == target or (target_host and urlsplit(url).netloc == target_host):
        matches.append(agent)
if len(matches) != 1:
    raise SystemExit(f"Expected one deployed agent matching GRADIENT_AGENT_ENDPOINT; found {len(matches)}.")
print(matches[0].get("uuid", ""))
' "$GRADIENT_AGENT_ENDPOINT"
}

attach_kb() {
  local kb_uuid database_id agent_uuid response
  IFS=$'\t' read -r kb_uuid database_id < <(find_kb)
  agent_uuid="${KB_AGENT_UUID:-$(find_agent)}"
  [[ -n "$agent_uuid" ]] || { echo "Agent UUID is missing" >&2; exit 1; }
  response="$(curl --fail --silent --show-error \
    -X POST \
    -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
    -H "Accept: application/json" \
    "$API_BASE/agents/$agent_uuid/knowledge_bases/$kb_uuid")"
  printf '%s' "$response" | python3 -c '
import json
import sys
agent = json.load(sys.stdin).get("agent", {})
attached = agent.get("knowledge_bases", [])
print("ATTACHED: genetics-literacy-kb to " + str(agent.get("name", "deployed agent")))
print("Agent knowledge bases: " + str(len(attached)))
'
}

apply_web_sources() {
  local kb_uuid database_id existing entry label url payload
  IFS=$'\t' read -r kb_uuid database_id < <(find_kb)
  echo "Managed database wiring confirmed; adding missing crawler sources to $KB_NAME."
  existing="$(curl --fail --silent --show-error \
    -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
    -H "Accept: application/json" \
    "$API_BASE/knowledge_bases/$kb_uuid/data_sources")"

  for entry in "${WEB_SOURCES[@]}"; do
    IFS='|' read -r label url <<<"$entry"
    if printf '%s' "$existing" | grep -Fq "$url"; then
      echo "SKIP: $label already exists"
      continue
    fi

    payload="$(python3 -c '
import json
import sys
print(json.dumps({
    "knowledge_base_uuid": sys.argv[1],
    "web_crawler_data_source": {
        "base_url": sys.argv[2],
        "crawling_option": "SCOPED",
        "embed_media": False,
        "exclude_tags": ["nav", "footer", "header", "aside", "script", "style", "form", "iframe", "noscript"],
    },
    "chunking_algorithm": "CHUNKING_ALGORITHM_SECTION_BASED",
    "chunking_options": {"max_chunk_size": 500},
}))
' "$kb_uuid" "$url")"

    curl --fail --silent --show-error -o /dev/null \
      -X POST \
      -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
      -H "Content-Type: application/json" \
      "$API_BASE/knowledge_bases/$kb_uuid/data_sources" \
      -d "$payload"
    echo "ADDED: $label"
  done

  echo "Web sources submitted. Run --upload-pdfs and then --index."
}

mode="${1:---list}"
case "$mode" in
  --list)
    list_sources
    ;;
  --check)
    require_control_plane
    check_kb
    ;;
  --create)
    require_control_plane
    create_kb
    ;;
  --download-pdfs)
    download_pdfs
    ;;
  --upload-pdfs)
    require_control_plane
    upload_pdfs
    ;;
  --apply-web)
    require_control_plane
    apply_web_sources
    ;;
  --index)
    require_control_plane
    start_indexing
    ;;
  --status)
    require_control_plane
    indexing_status
    ;;
  --attach)
    require_control_plane
    attach_kb
    ;;
  --help|-h)
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
