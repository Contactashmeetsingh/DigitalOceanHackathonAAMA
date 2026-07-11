# Frontend–backend integration contract

Status: updated 2026-07-11 (second pass) — the cohort-comparison and
population-map endpoints described below are now implemented, replacing the
earlier "planned aggregate-data guidance" placeholder for those two features.

This document is the handoff between the React frontend and the Flask service.
The implemented API: a health check, deterministic 23andMe-file analysis, six
server-vetted narrative categories, a synthetic-but-cited cohort-comparison
graph, and a real-reference-population map. There is still no live
peer-to-peer comparison against other real uploaders and no free-form chat
passthrough — see "Explicitly not implemented" below.

## The four planned UI surfaces, mapped to backend routes

| UI surface | Backend route | Notes |
|---|---|---|
| YC-style visual overhaul (shell, typography, layout) | none | Pure frontend/visual — no new data, no backend change implied. |
| 3D force-graph "compare to 100+ profiles" | `POST /api/comparison-cohort` | Synthetic-but-cited cohort; see below. |
| 3D globe "where you stand" / cross-country DNA framing | `POST /api/population-map` | Real named reference populations; see below. |
| Research + chat AI | `POST /api/narrative` (existing, unchanged) | Still exactly the six fixed categories — no new free-text endpoint was added for this pass. |

## One origin in development and production

Frontend code must use relative URLs such as `fetch("/api/analyze", ...)`. It
must not contain a deployment hostname or call a DigitalOcean model/agent URL
directly.

- **Local development:** Vite runs on `http://localhost:5173` and proxies
  `/api/*` and `/health` to Flask. The proxy target is `BACKEND_URL` when set,
  otherwise `http://localhost:8080`.
- **Production:** the Docker build compiles the `aman_frontend/` Vite source,
  copies its `dist/` artifact to `/app/frontend/dist`, then the Flask/Gunicorn
  service serves that bundle and the API from the same
  DigitalOcean App Platform origin on port 8080. App Platform terminates public
  HTTPS and checks `/health`.

This topology avoids a browser-side CORS or API-host configuration and keeps the
model boundary on the server:

```text
browser
  └── same-origin HTTPS
      └── Flask/Gunicorn on App Platform
          ├── / and static assets (built Vite app)
          ├── /api/analyze (deterministic local report)
          ├── /api/narrative (server-side Gradient AI call)
          │   ├── configured agent/RAG path
          │   └── serverless inference fallback
          ├── /api/comparison-cohort (synthetic, cited cohort graph)
          └── /api/population-map (real, cited reference populations)
```

`DIGITAL_OCEAN_MODEL_ACCESS_KEY` and `AGENT_ACCESS_KEY` are server runtime
secrets. `GRADIENT_AGENT_ENDPOINT` is server configuration. None belongs in a
`VITE_*` variable, JavaScript bundle, HTML, browser storage, frontend request,
or frontend log. A DigitalOcean control-plane token also never belongs in the
web application. The browser receives only the app's normalized API response.

All `/api/*` responses currently include:

```http
Cache-Control: no-store, max-age=0
Pragma: no-cache
```

## Implemented endpoints

### `GET /health`

App Platform health check and a safe connectivity probe. It does not test model
or Knowledge Base availability.

Success: HTTP 200

```json
{"status": "ok"}
```

### `POST /api/analyze`

Consumes `multipart/form-data` and builds the deterministic guided report. It
does not require a DigitalOcean key or a live model.

| Form field | Required | Contract |
|---|---:|---|
| `file` | yes | Extracted, non-empty 23andMe raw-data `.txt` export, UTF-8/UTF-8-BOM, at most 64 MB. |
| `population_label` | no | Broad label copied by the user from an existing result. It is context only and is never inferred or verified from DNA. |
| `requested_rsid` | no | Repeatable deterministic refusal-test surface, capped at 20 values. The main UI does not expose arbitrary marker exploration. |

Success: HTTP 200. The response contains `filename`, `vendor`, `chip_version`,
`reference_build`, `stats`, `retention`, `report_version`, `coverage`,
`population_context`, `traits`, `boundaries`, `transparency`, and `studies`.
Consumers should tolerate new additive fields and should treat documented
nullable values, such as an unknown chip version, as normal.

The upload is read into the in-memory request path. The response deliberately
does not include the raw file, a full SNP/genotype collection, or unretained
marker rows. The frontend must not persist the selected file or the report in
analytics, logs, URLs, or browser storage.

Stable application errors:

| HTTP | `code` | Meaning |
|---:|---|---|
| 400 | `missing_file` | No multipart file or an empty filename. |
| 400 | `invalid_file_type` | Filename does not end in `.txt`. |
| 400 | `invalid_encoding` | File cannot be decoded as UTF-8 text. |
| 400 | `empty_input` | Decoded file is empty or whitespace. |
| 400 | `unsupported_vendor` | Header cannot verify 23andMe, or identifies another service. |
| 400 | `invalid_header` | A 23andMe signature is present but its canonical column header is missing. |
| 400 | `no_valid_records` | No valid genotype records remain after validation; aggregate counts may appear in `details`. |
| 413 | `file_too_large` | Request exceeds the 64 MB safety limit. |

### `POST /api/narrative`

Consumes JSON after `/api/analyze` succeeds:

```json
{
  "category": "interpretation",
  "report": {"report_version": "1.0"}
}
```

`report` is the already boundary-checked analysis response, not an uploaded file.
Before a model call, Flask selects only vetted report fields. The accepted
category IDs are fixed server-side:

- `interpretation`
- `reference-panels`
- `history`
- `traits`
- `research`
- `limits`

The endpoint does not accept arbitrary prompt text. An extra client-supplied
question must not be treated as a supported contract; the server chooses the
canonical question for the category.

Success: HTTP 200

```json
{
  "category": "interpretation",
  "content": "Grounded answer text.",
  "citations": []
}
```

The live agent path can take roughly 60–90 seconds. The current server-side read
timeout is 90 seconds and Gunicorn's request timeout is 120 seconds. The UI
should keep a visible pending state, prevent duplicate submissions, and avoid an
automatic retry that could create a second model request. Agent failure may
fall back to serverless inference.

An empty `citations` array is a valid success response. It currently occurs when
the Knowledge Base has no usable retrieval result and always occurs on the
serverless fallback. The frontend may say that no retrieval citations were
returned; it must not fabricate links or describe an uncited answer as
retrieval-grounded.

Stable application errors:

| HTTP | `code` | Meaning |
|---:|---|---|
| 400 | `invalid_category` | Category is absent or not one of the six IDs. |
| 400 | `missing_report` | `report` is absent or is not a JSON object. |
| 502 | `narrative_unavailable` | No configured Gradient path succeeded. |

For application errors, branch on `code`, not on the human-readable `error`
message. The JSON error envelope is:

```json
{"error": "Human-readable explanation.", "code": "stable_code"}
```

Parser errors may additionally include privacy-safe aggregate `details`.
Unexpected platform/proxy failures are outside this stable application-error
set and should use the frontend's generic service-unavailable state.

### `POST /api/comparison-cohort`

Backs the 3D force-graph "compare to others" view (`3d-force-graph` /
`react-force-graph-3d`). Consumes the same already-analyzed `report` JSON as
`/api/narrative` — never a raw upload:

```json
{"report": {"report_version": "1.0"}}
```

There is no live dataset of 100+ consented uploaders — the repository only
has three open-consent PGP demo files. Every non-"you" node is therefore a
**labeled synthetic profile**, procedurally generated per request from
published, cited population allele-frequency literature (see
`backend/comparison.py` for the citation list), using the same broad
population buckets as `backend/ancestry.py`. Generation is deterministic: the
same analyzed report always returns the same graph (seeded from the report's
`stats`), so the frontend can safely cache/re-render without refetching.

Success: HTTP 200

```json
{
  "nodes": [
    {"id": "you", "is_synthetic": false, "is_user": true, "label": "You", "group": null, "traits": {"rs4988235": "AG"}},
    {"id": "cohort-1", "is_synthetic": true, "is_user": false, "label": "Illustrative profile 1", "group": "european", "traits": {"rs4988235": "AA", "...": "..."}}
  ],
  "links": [
    {"source": "you", "target": "cohort-1", "value": 0.62}
  ],
  "cohort_size": 120,
  "generation_method": "synthetic_from_published_allele_frequencies",
  "disclaimer": "Every node except \"you\" is a synthetic, illustrative profile ...",
  "citations": [{"label": "...", "url": "https://..."}]
}
```

`nodes`/`links` are already shaped for `ForceGraph3D().graphData({nodes, links})`
— `link.value` (0–1) is a same-population-marker match fraction, suitable
for edge distance/opacity. **The frontend must render `disclaimer` (or
equivalent copy) visibly whenever this view is shown**, and must not relabel
`is_synthetic: true` nodes as real users. `is_user`/`is_synthetic` are
mutually exclusive and exhaustive across `nodes`.

Stable application errors: `400 missing_report` (same shape as `/api/narrative`).

### `POST /api/population-map`

Backs the 3D globe "where you stand" view. Pair it with `globe.gl` (same
author/rendering stack as `3d-force-graph`, built for exactly this: real
lat/lon markers on a WebGL globe), not `3d-force-graph` itself, which is a
node-link graph library without globe/basemap support. Consumes the same
`report` JSON:

```json
{"report": {"report_version": "1.0"}}
```

Unlike the cohort graph, every entry here is a **real, named, citable
reference population** (1000 Genomes Project + Human Genome Diversity
Project panels — see `backend/population_map.py`), plotted at its real public
sampling location. Nothing is fabricated. Each entry carries an
`expected_similarity` (0–1) computed from the same published allele-frequency
tables against the user's own already-measured, boundary-checked trait
genotypes — this is an aggregate literature-derived expectation, not a
genetic-relatedness or ancestry-percentage claim.

Success: HTTP 200

```json
{
  "populations": [
    {"id": "GBR", "label": "British in England and Scotland", "country": "United Kingdom", "lat": 54.0, "lon": -2.0, "group": "european", "source": "https://...", "expected_similarity": 0.71}
  ],
  "you_marker": {"population_id": "GIH", "source": "user_supplied_label", "label": "South Asian"},
  "disclaimer": "This map shows real, named reference populations ...",
  "citations": [{"label": "...", "url": "https://..."}]
}
```

`you_marker` is `null` unless the user themselves supplied a recognized broad
population label earlier in the existing `/api/analyze` flow (it reads
`report.population_context.canonical_key`, the same field `/api/narrative`
already treats as user-supplied context). **The backend never infers a
location or country from DNA** — if the frontend wants the literal "a person
in Germany can have UK-pattern DNA" framing, express it only as: population
`X` (real, named, at its real sampling coordinates) has expected similarity
`Y` to the user's measured traits, using `expected_similarity` and `label`/
`country` verbatim. Do not invent a percentage-ancestry or geolocation claim
beyond what these two fields state. **Render `disclaimer` visibly** whenever
this view is shown, identically to the cohort graph.

Stable application errors: `400 missing_report` (same shape as `/api/narrative`).

## Explicitly not implemented

There is currently:

- no live peer/profile network endpoint and no database of 100+ real
  consented users — `/api/comparison-cohort` is synthetic-but-cited, not live
  peer data (see above);
- no endpoint that infers a user's location/country/ancestry from DNA —
  `/api/population-map`'s `you_marker` only ever echoes a label the user
  typed themselves, never a DNA-derived inference;
- no free-form ChatGPT/chat endpoint, conversation store, or arbitrary prompt
  passthrough (the research/chat surface is still the six fixed
  `/api/narrative` categories); and
- no endpoint that compares one uploaded genome directly with another real
  person's uploaded genome.

Both new endpoints return a top-level `disclaimer` string specifically so the
frontend does not need to hardcode this framing — display it, don't paraphrase
it away.

## Secret-free smoke check

With Flask running locally, or against the deployed same-origin app:

```bash
scripts/smoke_frontend_api.sh
scripts/smoke_frontend_api.sh https://example.ondigitalocean.app
BASE_URL=https://example.ondigitalocean.app scripts/smoke_frontend_api.sh
```

The script checks `/health` and two stable validation errors. It intentionally
does not upload a genome or invoke Gradient AI.
