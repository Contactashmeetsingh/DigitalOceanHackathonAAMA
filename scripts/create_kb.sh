#!/usr/bin/env bash
# Create the Gradient AI Knowledge Base (STRETCH — checkpoint-gated).
#
# Prefer WEB-CRAWLER data sources over uploading PDFs: far faster to stand up
# mid-hackathon, same citation payoff. Point the crawler at the population-
# genetics pages listed in data/kb_sources/README.md.
#
# Requires: doctl authed (doctl auth init) OR DIGITALOCEAN_TOKEN for the
# control-plane API (https://api.digitalocean.com/v2/gen-ai/...).
set -euo pipefail

: "${DIGITALOCEAN_TOKEN:?Set DIGITALOCEAN_TOKEN (dop_v1_* PAT) first}"

REGION="${REGION:-tor1}"
KB_NAME="${KB_NAME:-ancestry-audit-kb}"

# TODO(P2/codex): finish this. Two options:
#   (a) doctl:  doctl genai knowledge-base create --name "$KB_NAME" \
#                 --region "$REGION" --project-id <PROJECT_ID> \
#                 --embedding-model-uuid <UUID> --data-sources <web-crawler-json>
#   (b) API:    curl -X POST https://api.digitalocean.com/v2/gen-ai/knowledge_bases \
#                 -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
#                 -H "Content-Type: application/json" -d @kb_payload.json
#
# Then attach the KB to the agent in the console (or via the agent API) and
# enable include_retrieval_info on requests to get citations back.

echo "TODO: implement KB creation. See data/kb_sources/README.md for the source list."
