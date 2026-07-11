#!/usr/bin/env bash
# Secret-free, non-mutating frontend/API connectivity check.
# This script never uploads a genome and never invokes Gradient AI.

set -euo pipefail

if (( $# > 1 )); then
  echo "Usage: $0 [BASE_URL]" >&2
  exit 2
fi

base_url="${1:-${BASE_URL:-http://127.0.0.1:8080}}"
base_url="${base_url%/}"

case "$base_url" in
  http://* | https://*) ;;
  *)
    echo "BASE_URL must begin with http:// or https://" >&2
    exit 2
    ;;
esac

curl_common=(
  --silent
  --show-error
  --connect-timeout 10
  --max-time 30
  --write-out $'\n%{http_code}'
)

assert_response() {
  local label="$1"
  local raw="$2"
  local expected_status="$3"
  local expected_field="$4"
  local expected_value="$5"
  local status="${raw##*$'\n'}"
  local body="${raw%$'\n'*}"

  if [[ "$raw" != *$'\n'* || "$status" != "$expected_status" ]]; then
    echo "FAIL: $label expected HTTP $expected_status, received ${status:-no-status}." >&2
    [[ -n "$body" ]] && echo "$body" >&2
    exit 1
  fi

  SMOKE_JSON_BODY="$body" python3 - "$label" "$expected_field" "$expected_value" <<'PY'
import json
import os
import sys

label, field, expected = sys.argv[1:]
try:
    payload = json.loads(os.environ["SMOKE_JSON_BODY"])
except (KeyError, json.JSONDecodeError) as error:
    raise SystemExit(f"FAIL: {label} returned invalid JSON: {error}")

if not isinstance(payload, dict):
    raise SystemExit(f"FAIL: {label} returned JSON that is not an object")

actual = payload.get(field)
if actual != expected:
    raise SystemExit(
        f"FAIL: {label} expected {field}={expected!r}, received {actual!r}"
    )
PY

  echo "ok: $label (HTTP $status, $expected_field=$expected_value)"
}

if ! health_response="$(curl "${curl_common[@]}" "$base_url/health")"; then
  echo "FAIL: could not reach $base_url/health" >&2
  exit 1
fi
assert_response "health" "$health_response" "200" "status" "ok"

# An empty form body exercises validation only; no genome bytes are sent.
if ! analyze_response="$(
  curl "${curl_common[@]}" \
    --request POST \
    --data '' \
    "$base_url/api/analyze"
)"; then
  echo "FAIL: could not reach $base_url/api/analyze" >&2
  exit 1
fi
assert_response "analyze without a file" "$analyze_response" "400" "code" "missing_file"

# Invalid category validation happens before credentials or a model call.
if ! narrative_response="$(
  curl "${curl_common[@]}" \
    --request POST \
    --header 'Content-Type: application/json' \
    --data '{"category":"__smoke_invalid__","report":{}}' \
    "$base_url/api/narrative"
)"; then
  echo "FAIL: could not reach $base_url/api/narrative" >&2
  exit 1
fi
assert_response "narrative with an invalid category" "$narrative_response" "400" "code" "invalid_category"

echo "Smoke check passed for $base_url (no genome uploaded; no model request sent)."
