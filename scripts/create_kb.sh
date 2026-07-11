#!/usr/bin/env bash
# Curate data sources for the existing DigitalOcean genetics-literacy-kb.
#
# Safe by default: --list is offline, --check is read-only, and mutation requires
# --apply-web. PDF files are staged locally for explicit console upload because
# the control-plane file-upload object requires a DO-stored object key.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE="https://api.digitalocean.com/v2/gen-ai"
KB_NAME="${KB_NAME:-genetics-literacy-kb}"
DOWNLOAD_DIR="${KB_DOWNLOAD_DIR:-$ROOT_DIR/data/kb_sources/downloads}"

# label|URL — all use section-based chunking for clean HTML full text.
WEB_SOURCES=(
  "1000 Genomes global reference|https://pmc.ncbi.nlm.nih.gov/articles/PMC4750478/"
  "Diversity gap and research ethics|https://pmc.ncbi.nlm.nih.gov/articles/PMC11770215/"
  "Ancestrally matched Thai imputation|https://pmc.ncbi.nlm.nih.gov/articles/PMC10390539/"
  "GenomeAsia 100K pilot|https://pmc.ncbi.nlm.nih.gov/articles/PMC7054211/"
  "Sub-Saharan African panel evaluation|https://www.sciencedirect.com/science/article/pii/S2666979X23001003"
  "African-American reference panel|https://pmc.ncbi.nlm.nih.gov/articles/PMC8571350/"
  "East Asian 14393-genome panel|https://pmc.ncbi.nlm.nih.gov/articles/PMC10411914/"
  "Native American imputation panel|https://pmc.ncbi.nlm.nih.gov/articles/PMC8762266/"
)

# filename|label|URL — stage these for console file upload with semantic chunks.
PDF_SOURCES=(
  "disease-gene-population-differentiation-preprint.pdf|Disease-gene population differentiation preprint|https://www.biorxiv.org/content/10.64898/2026.01.02.697354.full.pdf"
  "global-imputation-accuracy-preprint.pdf|Imputation accuracy across 123 populations|https://www.biorxiv.org/content/10.1101/2023.05.22.541241.full.pdf"
)

usage() {
  cat <<'EOF'
Usage: scripts/create_kb.sh [--list|--check|--download-pdfs|--apply-web]

  --list            Print the curated manifest without network calls (default).
  --check           Verify genetics-literacy-kb and its managed database wiring.
  --download-pdfs   Download the two PDF file sources for manual console upload.
  --apply-web       Add missing web-crawler data sources through the DO API.

Adding sources triggers indexing. Upload staged PDFs and monitor/re-run indexing
in the DigitalOcean console before testing RAG. No mode creates infrastructure.
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
  response="$(curl --fail --silent --show-error \
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

check_kb() {
  local kb_uuid database_id
  IFS=$'\t' read -r kb_uuid database_id < <(find_kb)
  [[ -n "$kb_uuid" ]] || { echo "Knowledge base UUID is missing" >&2; exit 1; }
  echo "PASS: $KB_NAME exists and is backed by a DO Managed OpenSearch database."
  echo "Knowledge base UUID: $kb_uuid"
  echo "Database wiring: present (identifier intentionally not printed)"
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
  echo "Upload them to $KB_NAME in the DO console with semantic chunking, then re-index."
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

  echo "Web sources submitted. Upload the staged PDFs, then monitor/re-run indexing in the console."
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
  --download-pdfs)
    download_pdfs
    ;;
  --apply-web)
    require_control_plane
    apply_web_sources
    ;;
  --help|-h)
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
