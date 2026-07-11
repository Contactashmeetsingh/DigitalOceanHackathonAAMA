# Frontend–backend integration contract

Status: implemented behavior as of 2026-07-11, with proposed aggregate-data
guidance clearly marked as **planned**.

This document is the handoff between the React frontend and the Flask service.
The implemented API is intentionally small: a health check, deterministic
23andMe-file analysis, and six server-vetted narrative categories. It is not a
general ancestry, peer-comparison, mapping, or chat API.

## One origin in development and production

Frontend code must use relative URLs such as `fetch("/api/analyze", ...)`. It
must not contain a deployment hostname or call a DigitalOcean model/agent URL
directly.

- **Local development:** Vite runs on `http://localhost:5173` and proxies
  `/api/*` and `/health` to Flask. The proxy target is `BACKEND_URL` when set,
  otherwise `http://localhost:8080`.
- **Production:** the Docker build compiles Vite to `frontend/dist`, then the
  Flask/Gunicorn service serves that bundle and the API from the same
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
          └── /api/narrative (server-side Gradient AI call)
              ├── configured agent/RAG path
              └── serverless inference fallback
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

## Explicitly not implemented

There is currently:

- no live peer/profile network endpoint and no database of 100+ users exposed
  to the browser;
- no ancestry-map, inferred-country, user-location, globe-position, or genetic
  clustering endpoint;
- no free-form ChatGPT/chat endpoint, conversation store, or arbitrary prompt
  passthrough; and
- no endpoint that compares one uploaded genome with another person's genome.

Any current network or globe preview must therefore use version-controlled,
synthetic demo data or cited static aggregate evidence, label that status in the
visible UI, and remain useful without implying a live backend. Uploaded DNA must
never place a person on a map, assign a country/community, or create a node among
real people.

## Planned aggregate-data guidance (not live routes)

If a backend later replaces local demo data, add read-only, same-origin
aggregate endpoints under `/api/aggregates/*`. The names below are proposals,
not callable routes and not a promise of backend availability:

| Proposed route | Safe purpose | Must not return |
|---|---|---|
| `GET /api/aggregates/trait-network` | Synthetic profiles or sufficiently large cohort summaries for allowlisted, non-medical trait comparison. | Raw genotypes, upload IDs, names, contact data, person-level research records, or nodes representing identifiable people. |
| `GET /api/aggregates/evidence-atlas` | Cited counts and coverage metadata for published reference/validation evidence. | A user coordinate, inferred ancestry/country, or geography manufactured from an analytical population label. |

A future aggregate response should be versioned and self-describing:

```json
{
  "schema_version": "1.0",
  "dataset_id": "example-dataset",
  "dataset_version": "2026-07-11",
  "synthetic": true,
  "aggregate_only": true,
  "updated_at": "2026-07-11T00:00:00Z",
  "provenance": [],
  "methodology": "How records and metrics were produced.",
  "caveat": "Visible limitation and identity-safety copy.",
  "data": {}
}
```

Before switching the frontend from local data to either route, the backend and
frontend owners should agree on and test:

1. JSON Schema or equivalent fixtures, schema/dataset version handling, and
   stable error codes.
2. Provenance for every non-synthetic metric: source URL, publication date,
   denominator, metric definition, methodology, and last-review date.
3. Privacy thresholds and suppression rules for small cells. Prefer cohort
   counts/distributions; do not ship real-person nodes merely because names are
   removed.
4. A neutral default state. A user's deterministic allowlisted result may be
   shown beside an aggregate distribution, but never embedded as a genetic
   cluster or map coordinate.
5. Geographic integrity. If a source reports an analytical assignment rather
   than sample origin, render a non-geographic tile/table instead of country
   geometry.
6. Loading, empty, stale-version, partial-data, offline, and accessible table
   fallbacks. Synthetic fixtures remain visibly labelled until the live response
   passes these checks.
7. Server-side access to any database or DigitalOcean service. Runtime
   credentials remain in App Platform and never cross into browser JavaScript.

## Secret-free smoke check

With Flask running locally, or against the deployed same-origin app:

```bash
scripts/smoke_frontend_api.sh
scripts/smoke_frontend_api.sh https://example.ondigitalocean.app
BASE_URL=https://example.ondigitalocean.app scripts/smoke_frontend_api.sh
```

The script checks `/health` and two stable validation errors. It intentionally
does not upload a genome or invoke Gradient AI.
