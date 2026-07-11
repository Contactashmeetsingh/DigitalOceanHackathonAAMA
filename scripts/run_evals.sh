#!/usr/bin/env bash
# Upload and run the small DigitalOcean model-evaluation regression set.
#
# The requested /model_evaluation_runs endpoint evaluates a candidate model (or
# router), not a deployed workspace agent. Use the Agent Platform workspace UI
# when retrieval-specific agent metrics are required. This script still tests
# the same system-policy behaviors through ground-truth evaluation prompts.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE="https://api.digitalocean.com/v2/gen-ai"
DATASET_PATH="${DO_EVAL_DATASET_PATH:-$ROOT_DIR/evals/agent_behavior.jsonl}"
DATASET_NAME="$(basename "$DATASET_PATH")"
SYSTEM_PROMPT_PATH="${DO_EVAL_SYSTEM_PROMPT_PATH:-$ROOT_DIR/agent/system_prompt.md}"

usage() {
  cat <<'EOF'
Usage: scripts/run_evals.sh [--check|--resources|--upload|--run|--upload-and-run|--status UUID]

  --check            Validate the local JSONL dataset only (default; no network).
  --resources        List evaluation-capable model/metric identifiers.
  --upload           Upload the JSONL dataset and print its dataset UUID.
  --run              Start a run using DO_EVAL_DATASET_UUID.
  --upload-and-run   Upload the dataset, resolve its UUID, and start a run.
  --status UUID      Read the status of an existing evaluation run.

Network modes read DIGITALOCEAN_TOKEN from .env. Running requires:
  DO_EVAL_CANDIDATE_MODEL_UUID
  DO_EVAL_JUDGE_MODEL_UUID
  DO_EVAL_METRIC_UUIDS          comma-separated UUIDs
  DO_EVAL_DATASET_UUID          not needed for --upload-and-run

Optional: DO_EVAL_RUN_NAME (default ancestry-audit-safety) and
DO_EVAL_SYSTEM_PROMPT_PATH (default agent/system_prompt.md).
Evaluations consume candidate and judge tokens and are advisory; manually review
outputs and judge rationales before changing production behavior.
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

validate_dataset() {
  [[ -f "$DATASET_PATH" ]] || { echo "Dataset not found: $DATASET_PATH" >&2; exit 1; }
  python3 - "$DATASET_PATH" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
rows = []
for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
    if not raw.strip():
        continue
    try:
        row = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON on line {line_number}: {exc}") from exc
    missing = [key for key in ("input", "ground_truth") if not str(row.get(key, "")).strip()]
    if missing:
        raise SystemExit(f"Line {line_number} is missing: {', '.join(missing)}")
    rows.append(row)

if len(rows) < 4:
    raise SystemExit("Evaluation dataset must contain at least four behavior cases")
print(f"PASS: {len(rows)} UTF-8 JSONL evaluation cases with input + ground_truth")
PY
}

require_api() {
  load_env
  : "${DIGITALOCEAN_TOKEN:?Set DIGITALOCEAN_TOKEN in .env or the environment}"
  command -v curl >/dev/null || { echo "curl is required" >&2; exit 1; }
  command -v python3 >/dev/null || { echo "python3 is required" >&2; exit 1; }
}

api_get() {
  curl --fail --silent --show-error \
    -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
    -H "Accept: application/json" \
    "$1"
}

list_resources() {
  echo "Evaluation metrics:"
  api_get "$API_BASE/model_evaluation_metrics" | python3 -c '
import json, sys
data = json.load(sys.stdin)
for item in data.get("metrics", data.get("model_evaluation_metrics", [])):
    print("  {}: {}".format(
        item.get("metric_name") or item.get("name") or "<unnamed>",
        item.get("uuid") or item.get("metric_uuid"),
    ))
' 
  echo "Models (confirm evaluation support in the console/docs):"
  api_get "$API_BASE/models?per_page=200" | python3 -c '
import json, sys
data = json.load(sys.stdin)
for item in data.get("models", []):
    print("  {}: {}".format(
        item.get("name") or item.get("id") or "<unnamed>",
        item.get("uuid"),
    ))
'
}

resolve_dataset_uuid() {
  local attempts response uuid
  for attempts in 1 2 3 4 5 6 7 8 9 10; do
    response="$(api_get "$API_BASE/evaluation_datasets?dataset_type=EVALUATION_DATASET_TYPE_MODEL")"
    uuid="$(printf '%s' "$response" | python3 -c '
import json, sys
name = sys.argv[1]
items = json.load(sys.stdin).get("evaluation_datasets", [])
matches = [item for item in items if item.get("dataset_name") == name]
matches.sort(key=lambda item: item.get("created_at", ""), reverse=True)
print(matches[0].get("dataset_uuid", "") if matches else "")
' "$DATASET_NAME")"
    if [[ -n "$uuid" ]]; then
      printf '%s\n' "$uuid"
      return 0
    fi
    sleep 2
  done
  echo "Upload completed, but dataset UUID was not visible after 20 seconds." >&2
  echo "Find it in DO Evaluations > Datasets and set DO_EVAL_DATASET_UUID." >&2
  return 1
}

upload_dataset() {
  validate_dataset >&2
  local file_size request_body intent presigned_url
  file_size="$(wc -c < "$DATASET_PATH" | tr -d ' ')"
  request_body="$(python3 -c '
import json, sys
print(json.dumps({"files": [{"file_name": sys.argv[1], "file_size": sys.argv[2]}]}))
' "$DATASET_NAME" "$file_size")"

  intent="$(curl --fail --silent --show-error \
    -X POST \
    -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
    -H "Content-Type: application/json" \
    "$API_BASE/model_evaluation/datasets/file_upload_presigned_urls" \
    -d "$request_body")"
  presigned_url="$(printf '%s' "$intent" | python3 -c '
import json, sys
uploads = json.load(sys.stdin).get("uploads", [])
if not uploads or not uploads[0].get("presigned_url"):
    raise SystemExit("DO did not return a presigned dataset upload URL")
print(uploads[0]["presigned_url"])
')"

  curl --fail --silent --show-error \
    -X PUT \
    -H "Content-Type: application/octet-stream" \
    --data-binary "@$DATASET_PATH" \
    "$presigned_url" \
    -o /dev/null
  echo "Dataset bytes uploaded; waiting for registration..." >&2
  resolve_dataset_uuid
}

run_evaluation() {
  local dataset_uuid="${1:-${DO_EVAL_DATASET_UUID:-}}"
  : "${dataset_uuid:?Set DO_EVAL_DATASET_UUID or use --upload-and-run}"
  : "${DO_EVAL_CANDIDATE_MODEL_UUID:?Set DO_EVAL_CANDIDATE_MODEL_UUID}"
  : "${DO_EVAL_JUDGE_MODEL_UUID:?Set DO_EVAL_JUDGE_MODEL_UUID}"
  : "${DO_EVAL_METRIC_UUIDS:?Set comma-separated DO_EVAL_METRIC_UUIDS}"
  [[ -f "$SYSTEM_PROMPT_PATH" ]] || { echo "System prompt not found: $SYSTEM_PROMPT_PATH" >&2; exit 1; }
  local run_name="${DO_EVAL_RUN_NAME:-ancestry-audit-safety}"
  local candidate_name models payload response
  models="$(api_get "$API_BASE/models?per_page=200")"
  candidate_name="$(printf '%s' "$models" | python3 -c '
import json, sys
uuid = sys.argv[1]
items = json.load(sys.stdin).get("models", [])
match = next((item for item in items if item.get("uuid") == uuid), None)
if not match:
    raise SystemExit("Candidate model UUID was not found in the model catalog")
print(match.get("id") or match.get("name") or "")
' "$DO_EVAL_CANDIDATE_MODEL_UUID")"
  [[ -n "$candidate_name" ]] || { echo "Candidate model has no inference name" >&2; exit 1; }
  payload="$(python3 -c '
import json, sys
metrics = [value.strip() for value in sys.argv[5].split(",") if value.strip()]
if not metrics:
    raise SystemExit("At least one metric UUID is required")
with open(sys.argv[6], encoding="utf-8") as prompt_file:
    system_prompt = prompt_file.read().strip()
print(json.dumps({
    "name": sys.argv[1],
    "candidate_model_uuid": sys.argv[2],
    "judge_model_uuid": sys.argv[3],
    "dataset_uuid": sys.argv[4],
    "metric_uuids": metrics,
    "candidate_model_name": sys.argv[7],
    "candidate_model_source": "CANDIDATE_MODEL_SOURCE_SERVERLESS",
    "candidate_inference_config": {
        "system_prompt": system_prompt,
        "temperature": 0,
        "max_tokens": 512,
    },
}))
' "$run_name" "$DO_EVAL_CANDIDATE_MODEL_UUID" "$DO_EVAL_JUDGE_MODEL_UUID" "$dataset_uuid" "$DO_EVAL_METRIC_UUIDS" "$SYSTEM_PROMPT_PATH" "$candidate_name")"

  response="$(curl --fail --silent --show-error \
    -X POST \
    -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
    -H "Content-Type: application/json" \
    "$API_BASE/model_evaluation_runs" \
    -d "$payload")"
  printf '%s' "$response" | python3 -c '
import json, sys
data = json.load(sys.stdin)
run = data.get("model_evaluation_run", data)
uuid = run.get("uuid") or run.get("eval_run_uuid") or run.get("model_evaluation_run_uuid")
print("Evaluation started: {}".format(uuid or "UUID not returned"))
print("Review LLM-judge rationales manually; a passing score is advisory.")
'
}

mode="${1:---check}"
case "$mode" in
  --check)
    validate_dataset
    ;;
  --resources)
    require_api
    list_resources
    ;;
  --upload)
    require_api
    upload_dataset
    ;;
  --run)
    require_api
    validate_dataset
    run_evaluation
    ;;
  --upload-and-run)
    require_api
    dataset_uuid="$(upload_dataset)"
    run_evaluation "$dataset_uuid"
    ;;
  --status)
    require_api
    : "${2:?Pass an evaluation run UUID after --status}"
    api_get "$API_BASE/model_evaluation_runs/$2" | python3 -m json.tool
    ;;
  --help|-h)
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
