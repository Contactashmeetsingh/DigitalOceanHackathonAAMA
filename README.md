# Ancestry Audit Layer

An interpretation & transparency layer on top of consumer DNA results. Upload a
23andMe raw file and get a plain-language explanation of what it tells you — and,
crucially, **why confidence and specificity can weaken when the underlying
evidence underrepresents a population** (reference-panel bias). We are *not* an
ancestry tool; we are an audit layer for ancestry tools.

Built for **AI for Social Good — Hack with MLH & DigitalOcean** (SF, Jul 10–11 2026)
and designed for deployment on the **DigitalOcean Gradient AI Platform**. The
local guided-report product is complete and the App Platform frontend is live at
**[jellyfish-app-jbnoq.ondigitalocean.app](https://jellyfish-app-jbnoq.ondigitalocean.app)**.
The separately owned Gradient AI agent, Knowledge Base, guardrail, and
retrieval-citation checks are still not claimed as verified below.

## Active collaboration protocol

This file is the shared source of truth for every agent working in this
repository.

- **Read first:** Before responding to or changing anything for a new user
  request, read this `README.md` to understand the latest shared state.
- **Write back:** After every change, check, test, design decision, or blocker,
  add a concise dated entry to the iteration log and update any affected
  checklist/status item. Do not leave completed work only in chat.
- **Frontend owner (Codex):** Owns `aman_frontend/` UX, visual design, accessibility,
  responsive behavior, frontend tests, and frontend-facing documentation.
- **Backend/DigitalOcean owner (separate coding agent):** Owns API behavior,
  parsing/report logic, Gradient AI, Knowledge Base, credentials, App Platform,
  and live deployment.
- **Frontend release path:** The production App Platform app deploys from
  `origin/main` on GitHub (`deploy_on_push: true`); there is no separate frontend
  branch. After a frontend change is verified, Codex must scope the diff to
  frontend-owned files and required documentation, commit and push it to `main`,
  then record the commit SHA, live URL, and smoke-check result here.
- **Never bundle another owner's work:** Do not push an uncommitted/staged
  backend or DigitalOcean change with a frontend release. Coordinate first or
  isolate it in its own commit/worktree so App Platform deploys only reviewed
  work.
- **Respect boundaries:** Read the latest status before editing shared contracts;
  preserve the other owner's changes and record cross-team dependencies rather
  than silently overwriting them.

### Checked this coordination turn

- [x] README reviewed before work.
- [x] Frontend and backend/DigitalOcean ownership documented.
- [x] Ongoing README update/checklist rule recorded for both agents.
- [x] Frontend production release path confirmed: `origin/main` → App Platform.
- [x] Scoped-push rule recorded; another owner's dirty work will not be bundled.

## Iteration log

- **2026-07-11 — Concurrent frontend-directory rename recovery (in
  progress):** A concurrently pushed commit renamed the Vite source from
  `frontend/` to `aman_frontend/` but left the production Dockerfile and current
  documentation pointing at the deleted path, which would make the next App
  Platform build fail before compilation. Preserved that commit and its bundled
  design tooling, updated only the source-copy/build commands and current docs,
  and added a narrow `.dockerignore` so local editor-skill packages and genome
  samples never enter the container build context. Container validation remains
  before this repair is marked complete.
- **2026-07-11 — Report-grounded visualization handoff (in progress):** The
  frontend now has a renderer-safe adapter for the implemented
  `/api/comparison-cohort` contract. It clusters the returned synthetic cohort
  by broad reference model, keeps the API's modeled similarity values and
  visible disclaimer/citations, and deliberately strips both user and
  synthetic genotype calls before graph nodes reach WebGL or the accessible
  table. Also pinned the two 3D runtime dependencies to exact versions, added
  the required MIT notice for `3d-force-graph`, and added production page
  metadata/favicon polish. The population-map adapter now renders cited
  reference-panel coordinates and modeled non-medical trait similarity, keeps
  missing scores as `n/a`, and creates a display anchor only from a recognized
  user-supplied broad label. The two adapters, same-origin API helpers, and
  safety fallbacks pass all `21` frontend tests; the production build succeeds
  with both 3D engines retained as lazy chunks. The smoke script passes shell
  syntax validation and intentionally requires a real base URL. Production-
  build browser verification remains in progress.
- **2026-07-11 — Production visual QA and graceful degradation (in
  progress):** The production build's desktop hero, 128-profile comparison
  shell, filter behavior, globe data controls, and six-topic research room were
  inspected in a clean guest browser. The same Chrome session later reported
  WebGL unavailable after repeated context creation, while all semantic data
  controls remained operable. Added a deterministic, color-clustered SVG
  network fallback so the comparison surface remains visually useful as well
  as accessible when WebGL2 is unavailable; the globe already retains its
  CSS/SVG depth fallback and complete region list. The fallback pass preserves
  all `21` passing frontend tests, a successful Vite production build, and a
  clean `git diff --check`; the initial JavaScript bundle remains about 219 kB
  (69 kB gzip), with both 3D engines still lazy-loaded. Mobile-width browser
  verification remains.
- **2026-07-11 — Four-surface frontend verification (in progress):** The
  integrated React shell, upload/report path, deterministic visualization data,
  lazy 3D scenes, and research workspace compile successfully. All `13` Node
  tests pass, the Vite production build succeeds, and `git diff --check` is
  clean. The main bundle remains about 206 kB (65 kB gzip); Three.js and the
  official force graph are separate lazy chunks (about 182 kB and 201 kB gzip)
  and are not in the initial bundle. Browser-based desktop/mobile and WebGL
  interaction QA remains before the redesign is marked complete.
- **2026-07-11 — Four-surface frontend redesign (started):** Rebuild the
  frontend around the supplied dark YC-backed product reference: a restrained
  overview shell, an interactive 100+ profile trait-comparison network, a 3D
  ancestry-context globe, and a Gradient AI research workspace. Preserve the
  existing upload/report path and safety boundaries, label all placeholder
  comparison/location data as synthetic demo content, add an explicit
  frontend/backend contract, and verify desktop/mobile behavior before release.
  Installed pinned, reproducible frontend dependencies for the supplied official
  `3d-force-graph` implementation (`1.80.0`) and Three.js (`0.179.1`); npm still
  reports one moderate and one high advisory, with no unreviewed force-upgrade
  applied. Added a tested same-origin frontend API client for the existing
  multipart analysis and six-category narrative contracts, including stable
  error handling and safe citation-URL filtering.
  Added deterministic, genotype-safe preview data (128 synthetic comparison
  profiles, six trait hubs, and six declared-context globe regions), lazy
  WebGL adapters for the official force-graph package and Three.js, and a
  constrained research-chat workspace that uses only the six server-vetted
  narrative categories. Added `docs/frontend-backend-contract.md` and the
  secret-free `scripts/smoke_frontend_api.sh`; syntax, mocked endpoint behavior,
  and focused Flask validation checks pass without uploading a genome or
  invoking a model.
- **2026-07-11 — DigitalOcean credential verifier (started):** Validate and
  publish the standalone four-check diagnostic for serverless inference,
  control-plane Knowledge Bases, deployed-agent RAG evidence, and credential
  wiring without exposing or committing secrets.
- **2026-07-11 — DigitalOcean credential verifier (completed):** Added the
  rerunnable `scripts/verify_do.py` diagnostic with fail-closed credential
  presence checks, Claude-to-Llama inference fallback, Knowledge Base status
  reporting, agent retrieval/citation inspection, and key-wiring validation.
  A live run passed inference on `anthropic-claude-4.6-sonnet`, passed the
  control-plane request with zero visible KBs, returned a grounded agent answer
  with retrieval/citation evidence (`FULL PASS`), and confirmed distinct keys and
  the correct agent hostname. No secret values are printed or committed.
- **2026-07-11 — Local demo completion (started):** Finish every local,
  non-DigitalOcean part of the demo: strict 23andMe validation, in-memory upload
  handling, deterministic report assembly, explicit refusal behavior, broad-label
  context supplied by the user, complete React report rendering, integration
  tests, and submission documentation. DigitalOcean provisioning, managed
  Knowledge Base work, runtime credentials, and live deployment are being handled
  separately and are intentionally out of scope for this pass.
- **2026-07-11 — Workspace credential hygiene (completed):** Excluded exported
  AI-session transcripts from Git because they may contain pasted credentials.
  Confirmed the reachable committed history has no DigitalOcean token-shaped
  strings. Any credential previously pasted into a transcript must still be
  rotated in its issuing console; transcript contents are not application config.
- **2026-07-11 — Safety and population context (completed):** Implemented a
  tested default-deny boundary that permits only the non-medical trait allowlist,
  gives content-neutral refusals for every other rsID, and returns deterministic
  honesty responses for health risk, ancestry re-inference, and exact ethnicity.
  Added exact-match normalization for an optional user-supplied broad population
  label; genotype data never enters the normalization function and the response
  always records `inferred_from_dna: false`.
- **2026-07-11 — Deterministic guided-report model (completed):** Added a local,
  service-independent report assembler that combines allowlisted traits, missing
  chip coverage, safety boundaries, population context, evidence-transfer
  transparency, and the dated research bridge without exposing the raw genome.
  Repeated input produces identical output, and focused safety/context/report
  validation passes (`10 passed`).
- **2026-07-11 — Pitch-document scaffold (completed):** Added a timed
  three-minute demo script, a four-slide narrative, and a submission checklist.
  DigitalOcean claims are deliberately bracketed until the separately owned live
  agent, retrieval, guardrail, and App Platform checks have evidence.
- **2026-07-11 — Complete guided-report UI (completed):** Added an optional
  broad population-label field that is explicitly copied from an existing result
  and never inferred. The React result view now renders parser coverage,
  allowlisted measured/missing traits with evidence links, default-deny and
  honesty boundaries, reference-panel context, and dated studies with official
  status and consent/privacy links. Partial-response fallbacks, keyboard focus,
  reduced motion, dark mode, forced colors, and responsive layouts are preserved;
  the Vite production build passes.
- **2026-07-11 — Strict parser and real-PGP validation (completed):** Production
  uploads now require the recognizable 23andMe signature and canonical columns;
  malformed marker IDs, chromosomes, positions, and genotypes are rejected or
  counted without echoing raw rows. Added exact no-call, duplicate/conflict,
  call-rate, chromosome, MT/Y, explicit build, and conservative chip-metadata
  handling. Duplicate counts cover the complete file; conflicting-duplicate
  checks are explicitly labeled as scoped to retained allowlist markers in the
  memory-bounded API path. Full open-consent PGP v3, v4, and v5 exports parsed with zero
  malformed rows (963,050; 601,895; and 638,573 valid-position counts).
  Their headers do not explicitly name chip generation, so the parser correctly
  leaves `chip_version` unknown rather than guessing from marker counts.
- **2026-07-11 — Bounded-memory and privacy-safe API (completed):** The complete
  `/api/analyze` route now validates the upload, keeps multipart bytes in RAM
  instead of Werkzeug's default disk-spooled temporary file, disables response
  caching, retains only allowlisted genotype calls, and returns the deterministic
  traits/boundaries/context/studies report without the raw genome. Selected-marker
  parsing reduced v5 peak parser RSS from about 426 MB to 133 MB; sequential full
  API checks over all three PGP exports peaked near 221 MB. Invalid extension,
  encoding, header/vendor, empty, missing, and oversized uploads return stable
  JSON errors.
- **2026-07-11 — Scientific evidence correction pass (completed):** Audited the
  trait and chart claims against primary sources. Removed a non-portable universal
  photic-sneeze allele direction; combined TAS2R38 into one conservative,
  unphased three-marker haplotype result; fail closed unless GRCh37 plus-strand
  orientation is verified; updated lactase, ACTN3, cilantro, and earwax support;
  and added multi-source citations. Rebuilt the TOPMed r2 chart from the mutually
  exclusive 97,256-person primary breakdown, nested the Pakistani subset under
  South Asian rather than plotting it as a peer population, added the unassigned
  count, and corrected the historical 96% metric from “studies” to “participants.”
- **2026-07-11 — Local verification (completed):** `69` Python tests pass across
  parsing, traits, boundaries, ancestry context, studies, deterministic reports,
  upload privacy, and Flask integration. Four Node data/interaction tests pass,
  the React production build succeeds, and the full API returns HTTP 200 for the
  three real PGP validation exports. Local visual QA confirmed the upload shell,
  corrected chart hierarchy, accessible labels, and keyboard-operable question
  cards in a clean guest browser.
- **2026-07-11 — Repository publish (started):** Inspect local/remote divergence,
  preserve unrelated working-tree changes, integrate the existing remote commit
  safely, and push the completed feature commits to `origin/main`.
- **2026-07-11 — Repository publish (completed):** Rebased six feature commits
  onto the existing remote credential-wiring fix, verified that the committed
  tree contains no tracked `.env`, DigitalOcean token pattern, literal credential
  assignment, or credential-shaped App Platform key, and pushed to `origin/main`
  without force. Restored every pre-existing local edit and untracked file with
  matching checksums; none were staged or committed.
- **2026-07-11 — Agent evaluation harness (started):** Verify the current
  DigitalOcean model-evaluation API, add a small prompt/expected-behavior dataset
  covering citations, medical refusal, ancestry precision limits, and
  reference-panel bias, then add a fail-closed control-plane runner.
- **2026-07-11 — Agent evaluation harness (completed):** Added eight JSONL
  ground-truth cases and a fail-closed runner for dataset presigning/upload,
  live model/metric discovery, `/model_evaluation_runs`, and status checks. The
  runner applies the version-controlled agent system prompt and never prints
  credentials or presigned URLs. Confirmed local schema/shell validation, live
  read-only resource discovery, and all five parser tests; no billable run was
  started.
- **2026-07-11 — Reference-panel visualization (started):** Verify a single
  comparable population-composition dataset, add a lightweight accessible chart
  that makes representation imbalance legible, label denominators and source
  dates, and keep historical GWAS metrics separate from reference-sample bars.
- **2026-07-11 — Reference-panel visualization (completed):** Added an
  accessible, dependency-free TOPMed r2 sample-count chart with a shared 97,256
  denominator, selectable comparison highlight, per-bar primary citations, and
  explicit label/coverage caveats. Kept the historical finding that 96% of the
  GWAS participants assessed in 2009 were of European descent in a separately
  sourced context card. Confirmed with a Vite production build and all five
  parser tests.
- **2026-07-11 — Frontend states and accessibility (started):** Preserve the
  current upload/analyze endpoint flow while adding explicit loading, empty, and
  error feedback; keyboard/focus improvements; readable high-contrast styling;
  and six tappable, plain-language Q&A category prompts.
- **2026-07-11 — Frontend states and accessibility (completed):** Added file
  validation, upload/zero-result/network states, result focus management,
  keyboard-operable controls, semantic result markup, reduced-motion and
  high-contrast styling, and six responsive suggested-question cards without
  inventing a Q&A endpoint. Confirmed with a Vite production build and all five
  parser tests; npm reported two dependency advisories, left unchanged to avoid
  an unrequested breaking upgrade.
- **2026-07-11 — Research bridge curation (started):** Verify current official
  participation/status pages for genomics programs serving underrepresented
  populations, expand the dated study records with consent/privacy context, and
  implement broad-label matching with a non-empty default fallback.
- **2026-07-11 — Research bridge curation (completed):** Curated six dated
  programs with participation, consent/privacy, official status sources, and an
  explicit distinction between public enrollment and consortium/data pathways.
  Added broad-label aliases, enrollment-first matching, and a two-program default;
  confirmed with `9 passed` across study and parser tests.
- **2026-07-11 — Knowledge Base corpus (started):** Verify the requested
  population-genetics sources, add balanced South Asian, West African, East
  Asian, and Indigenous American coverage, and replace the KB script stub with
  a safe DigitalOcean control-plane workflow that checks managed-database wiring
  before adding sources or requesting re-indexing.
- **2026-07-11 — Knowledge Base corpus (completed):** Added eight curated web
  crawlers and two staged PDF sources, documented each source's purpose, and
  implemented offline listing, read-only wiring checks, idempotent web-source
  application, and PDF staging. `bash -n`, the manifest listing, and all five
  parser tests pass. The live read-only check confirmed that
  `genetics-literacy-kb` is not present for the current token, so create/select
  the DO-managed KB, upload the staged PDFs, and re-index in the console before
  expecting these sources in RAG; no external resources were mutated.
- **2026-07-11 — Trait allowlist expansion (started):** Verify and add only
  well-replicated, non-medical genotype interpretations for lactase persistence,
  earwax type, TAS2R38 bitter tasting, photic sneeze, ACTN3 muscle composition,
  and cilantro taste, then run focused checks plus the parser regression suite.
- **2026-07-11 — Trait allowlist expansion (completed):** Added eight cited SNP
  entries with build-37 plus-strand genotype maps, population/evidence caveats,
  deterministic missing-chip handling, and lookup output fields for interpretation,
  evidence, and citation. Confirmed with `8 passed` across trait and parser tests.
- **2026-07-11 — Non-DigitalOcean product pass (completed):** Replaced the stale
  roadmap with the actual acceptance state, checked off every locally verified
  product requirement, documented open-consent validation samples and submission
  assets, and isolated all unverified agent, Knowledge Base, credential, and live
  deployment work in the DigitalOcean handoff. Final local verification commands
  and remaining submission placeholders are listed below.
- **2026-07-11 — Final local edge-case audit (completed):** Disabled Flask's
  direct-run debugger and limited it to localhost, bounded numeric parser fields
  so hostile rows fail safely, rejected contradictory vendor signatures, exposed
  retained-marker conflict scope in the API, and froze file replacement while an
  analysis is in flight. Added regression coverage and reran the full local gate:
  `78` Python tests, `4` Node tests, and the production frontend build pass.
- **2026-07-11 — Evidence-console UI direction (completed):** Reworked the
  frontend hierarchy around provenance, restraint, and legibility: a safeguard
  rail, clearer report preview, an optional (never preselected) chart highlight,
  and a screen-reader-friendly data table. Added a safe 2D/3D evidence-atlas
  implementation brief: future visuals may show cited aggregate evidence only;
  they must never locate or classify a person from their DNA.
- **2026-07-11 — Shared-agent coordination rule (completed):** Designated Codex
  as the frontend owner and the separate coding agent as backend/DigitalOcean
  owner. Both owners must read this README before each new request and record
  every change, verification result, completion, and blocker here so the shared
  repository state stays visible.
- **2026-07-11 — Frontend release discipline (completed):** Confirmed that the
  App Platform production path is GitHub `origin/main` with deploy-on-push, not a
  separate frontend branch. Frontend releases must be verified, scoped to
  frontend-owned files plus documentation, committed/pushed to `main`, and then
  recorded with a live smoke check. The current dirty
  `backend/gradient_client.py` file remains excluded from frontend publishing.
- **2026-07-11 — Official App Platform frontend launch (completed):** Verified
  the active `ancestry-audit-layer` App Platform deployment for commit
  `2de758b26b203b67da134206e583507ad7fd96be` at
  [https://jellyfish-app-jbnoq.ondigitalocean.app](https://jellyfish-app-jbnoq.ondigitalocean.app).
  The live homepage returned HTTP 200 and the current Vite bundle; `/health`
  returned `200 {"status":"ok"}`; and an empty `/api/analyze` request returned
  the expected no-store `400 missing_file` JSON response. No genome file or
  other sensitive personal data was sent during this smoke test.
- **2026-07-11 — Backend: live agent-path 400 root-caused and fixed
  (completed):** `/api/narrative` was returning a DO edge 5xx in production.
  Root-caused end-to-end by live-tailing `doctl apps logs`: (1) added an
  agent→serverless fallback in `gradient_client.explain()` so one bad path
  doesn't fail the whole feature; (2) fixed `_via_agent()` to POST to
  `.../api/v1/chat/completions?agent=true` (bare path does not route to the
  agent/RAG handler — confirmed against `scripts/verify_do.py`'s live FULL
  PASS run); (3) fixed `_via_serverless()`, which was crashing with
  `TypeError: Client.__init__() got an unexpected keyword argument 'proxies'`
  (openai 1.51.0's default client construction is incompatible with newer
  httpx) by passing an explicit `http_client=DefaultHttpxClient(...)`, the
  same workaround already proven in `verify_do.py`; (4) added stderr logging
  on agent-path failure, which surfaced the true final blocker: the DO agent
  API hard-rejects any `system`/`developer` role message
  (`"system and developer messages are not allowed; agent instructions are
  set via agent configuration"`, HTTP 400) because agent instructions are
  configured server-side in the console, not per-request. Fixed `_via_agent()`
  to strip system/developer turns before sending (the user turn already
  carries the question and safe report context); `_via_serverless()` is
  unchanged and still sends the full message list, since serverless
  completions have no server-side agent config to conflict with. Added
  `tests/test_gradient_client.py::test_via_agent_strips_system_and_developer_messages_before_posting`
  and 2 other fallback-behavior tests; full suite (82 tests) passes. Deployed
  to `origin/main` and verified live. **Known remaining gap:**
  `scripts/verify_do.py`'s control-plane check found zero visible Knowledge
  Bases, so live retrieval citations may still be sparse/empty until a KB is
  provisioned and attached — that's a DigitalOcean-console provisioning task,
  not a code fix, and is tracked below.
- **2026-07-11 — Live verification of the agent-path fix (completed):**
  Deployed commit `cca2fc4` (deployment `7a578d01`), confirmed ACTIVE, then
  hit live `POST /api/narrative` twice. First call fell back to serverless
  (agent leg hit a 90s read timeout — logged, not an error, by design).
  Second call completed via the **agent path directly, no fallback**, in
  ~81s, HTTP 200, well-formed grounded answer, `citations: []` (expected —
  no KB attached yet, see gap above). **Demo-day latency risk:** 81s is
  close to our 90s agent read-timeout / 120s gunicorn timeout; the frontend
  has no explicit fetch timeout so it will wait, but expect the live agent
  answer to sometimes take 60–90s and occasionally silently fall back to the
  faster, uncited serverless path. This is graceful (never a hard failure)
  but worth knowing before presenting live.
- **2026-07-11 — Knowledge Base creation declined by product owner (recorded):**
  Offered to run `scripts/create_kb.sh --apply-web` to provision the DO-managed
  Knowledge Base (the biggest remaining gap for the Gradient AI prize track).
  Product owner declined — no billable DO infrastructure created this session.
  The gap (zero visible KBs, empty `citations` on `/api/narrative`) remains
  open and unchanged from the entry above; the deterministic guided report and
  serverless-fallback narrative path remain the safe, fully-working demo path
  regardless.
- **2026-07-11 — Backend support for Codex's four-surface frontend redesign
  (completed):** Codex owns all four frontend surfaces (YC-style visual
  overhaul, 3D force-graph cohort comparison, 3D globe/map, research+chat) —
  see that owner's own entry above. Per explicit product-owner direction, this
  backend agent stayed backend-only and did not touch any `frontend/` file.
  Built the two new data endpoints Codex's graph/globe components need, plus
  the full connection spec, so Codex can implement against a stable contract
  without waiting on backend iteration:
  - `backend/comparison.py` + `POST /api/comparison-cohort` — a
    `3d-force-graph`-shaped `{nodes, links}` response for the "compare to 100+
    profiles" view. There is no real dataset of 100+ consented uploaders (the
    repo has three open-consent PGP demo files), so every non-"you" node is a
    **labeled synthetic profile** (`is_synthetic: true`), procedurally drawn
    per request from published, cited population allele-frequency literature
    (Bersaglieri 2004 lactase persistence, Yoshiura 2006 earwax type, Yang 2003
    ACTN3, Wooding 2004 TAS2R38), using the same broad population buckets as
    `backend/ancestry.py`. Deterministic: seeded from the report's own `stats`,
    so the same analyzed file always returns the same graph. The response
    carries a mandatory top-level `disclaimer` and `citations`.
  - `backend/population_map.py` + `POST /api/population-map` — real, named
    reference populations (1000 Genomes Project + HGDP panels) at their real
    public sampling coordinates, each with an `expected_similarity` (0-1)
    computed from the same cited allele-frequency tables against the user's
    own measured traits. The optional `you_marker` is set **only** when the
    user themselves supplied a recognized broad population label earlier via
    the existing `/api/analyze` flow (`population_context.canonical_key`) —
    the backend never infers a location, country, or ancestry from DNA. Also
    carries a mandatory `disclaimer` and `citations`.
  - **Product-framing note:** the product owner explicitly asked for and
    confirmed (overriding this agent's flagged safety concern) a literal
    "where you stand" / cross-country DNA-sharing framing for the map, which
    is in tension with this project's own previously-documented hard boundary
    against DNA-based geolocation (see `docs/ui-visualization-roadmap.md`).
    The implementation resolves this by keeping every fact the API returns
    literally true (real reference populations at real coordinates; an
    aggregate literature-derived similarity score; a marker that only ever
    echoes what the user typed) and pushing the "where you stand" *narrative*
    entirely into frontend copy, not backend inference — see
    `docs/frontend-backend-contract.md` for the exact do/don't phrasing
    guidance given to Codex.
  - Updated `docs/frontend-backend-contract.md`: added a "four planned UI
    surfaces, mapped to backend routes" table and full request/response specs
    for both new endpoints, and corrected the now-stale "Explicitly not
    implemented" / "planned aggregate-data" sections that predated this work.
  - Added `tests/test_comparison.py` (5 tests), `tests/test_population_map.py`
    (5 tests), and `tests/test_app_visualizations.py` (4 Flask integration
    tests). Full suite: `96 passed`.

## Hard boundaries (by design, not just policy)
- No ancestry inference — interpretation only.
- No health/disease claims — traits are illustrative and non-medical only.
- No fine-grained ethnicity claims beyond what the literature supports.
- Privacy-first: application code processes uploads **in memory, does not
  intentionally persist them, and never returns the raw genome**.

## Data ethics
Demo data is from the **Harvard Personal Genome Project** (open-consent, public).
Public PGP records are used only to validate file-format and chip-coverage
behavior; they are not treated as a representative population sample and their
profile text is never converted into an ancestry label. See
[`data/samples/README.md`](data/samples/README.md) for the exact open-consent v3,
v4, and v5 validation records.

## Run locally

Backend (Flask API):
```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m backend.app          # API on http://localhost:8080
python -m pytest -q            # full Python suite
```

No DigitalOcean key or `.env` file is required for the deterministic local
report. `.env.example` documents credentials only for the separately owned live
agent/deployment extension.

Frontend (React + Vite):
```bash
cd aman_frontend && npm install
npm run dev                    # dev server on http://localhost:5173, proxies /api to Flask
npm test                       # frontend data/interaction tests
npm run build                  # -> aman_frontend/dist; Docker copies it to /app/frontend/dist
```

## Build status

### Local product — complete

- [ ] Four-surface frontend redesign is implemented and visually verified at
      desktop and mobile widths.
- [ ] App Platform Docker build follows the `aman_frontend/` source rename and
      still places the production bundle at Flask's `/app/frontend/dist` path.
- [ ] Report-grounded comparison and population-map responses render their
      backend-provided disclaimers/citations and retain safe preview fallbacks.
- [x] Frontend/backend integration contract documents current endpoints and
      clearly separates live behavior from planned aggregate visualization data.
- Strict 23andMe text validation with exact call/no-call, malformed, duplicate,
  chromosome, reference-build, and coverage accounting; the API reports that
  conflicting-duplicate checks are scoped to retained allowlist markers.
- Selected-marker retention and an in-memory multipart request stream: raw genome
  uploads are neither written to disk nor returned by the API.
- Deterministic `/api/analyze` report assembly with stable JSON errors, no-store
  headers, safe filenames, and no dependency on a live model.
- Default-deny interpretation boundaries, three explicit honesty limitations,
  and optional broad population context that is copied from the user rather than
  inferred from DNA.
- Conservative GRCh37-plus-strand trait interpretations, missing-chip handling,
  multi-source evidence links, and a single unphased TAS2R38 result.
- Complete responsive React report: parsing coverage, measured/withheld/missing
  traits, citations, population context, honest limits, studies, and accessible
  interaction states.
- Corrected TOPMed r2 reference-panel chart with a shared denominator, nested
  Pakistani subset, unassigned count, methodology caveat, and integrity tests.
- Dated research bridge with participation, status, consent/privacy context, and
  official sources.
- Real open-consent PGP v3/v4/v5 API validation, 96 Python tests, four Node
  data/interaction tests, a successful production build, and local visual QA.
- [x] `/api/comparison-cohort` (synthetic, cited cohort graph) and
      `/api/population-map` (real, cited reference populations) backend
      endpoints, documented in `docs/frontend-backend-contract.md`, for
      Codex's 3D force-graph and 3D globe surfaces.

### DigitalOcean deployment and AI handoff

The App Platform frontend is live at
[jellyfish-app-jbnoq.ondigitalocean.app](https://jellyfish-app-jbnoq.ondigitalocean.app)
from active deployment `bf2c8b1b-e958-4732-8dbf-9b8117bc2d23` (commit `2de758b`).
The prepared local artifacts for remaining AI work are `.env.example`,
`agent/system_prompt.md`, `data/kb_sources/`, `scripts/create_kb.sh`,
`evals/agent_behavior.jsonl`, and `scripts/run_evals.sh`.

- [ ] Rotate every model, agent, or control-plane credential pasted into any log.
- [x] Validate the App Platform spec and configure its runtime secret entries.
- [x] Deploy the current repository revision and record the live URL/revision.
- [ ] Create or select the agent; verify its model, prompt, and guardrail settings.
- [ ] Create/select the Knowledge Base, index the prepared sources, attach it,
      and verify retrieval on the demo prompts.
- [x] Finish and test the optional `backend/gradient_client.py` agent response
      and retrieval-citation mapping before advertising model-generated answers.
      Agent-path 400 (system/developer messages rejected) root-caused, fixed,
      tested, and deployed live 2026-07-11; see Iteration log. Real retrieval
      citations still depend on the (currently empty) Knowledge Base below.
- [x] Run live homepage, `/health`, and no-file invalid-upload smoke checks.
- [ ] Run a live valid-upload test with an approved open-consent PGP file, then
      test citations, default-deny refusal, and fallback behavior. Start a
      billable evaluation only with explicit approval and manually review its
      judge rationales.

The deterministic guided report remains the safe demo path if the live agent is
not verified. It does not require any DigitalOcean credential.

### Submission materials

- [`docs/demo-script.md`](docs/demo-script.md) — timed three-minute narration.
- [`docs/slides-outline.md`](docs/slides-outline.md) — four-slide story and proof
  points.
- [`docs/submission-checklist.md`](docs/submission-checklist.md) — local,
  DigitalOcean, and publishing acceptance checks.
- [`data/samples/README.md`](data/samples/README.md) — reproducible open-consent
  v3/v4/v5 validation records.
- [`docs/ui-visualization-roadmap.md`](docs/ui-visualization-roadmap.md) — safe
  2D/3D evidence-atlas specification and copy-ready implementation prompt.
- [`docs/frontend-backend-contract.md`](docs/frontend-backend-contract.md) —
  implemented same-origin API contract, privacy/latency behavior, and the
  connection spec for all four planned frontend surfaces (comparison-cohort
  and population-map endpoints are now implemented, not planned).

The live URL is verified above. Final screenshots, recording, team credits, and
any bracketed Gradient AI claims must be filled only after their separate checks.

### Backend support for the four-surface frontend redesign

- [x] `POST /api/comparison-cohort` — synthetic-but-cited cohort graph for the
      3D force-graph "compare to others" view (`backend/comparison.py`).
- [x] `POST /api/population-map` — real, named reference populations for the
      3D globe view (`backend/population_map.py`).
- [x] Connection spec for all four planned UI surfaces documented in
      `docs/frontend-backend-contract.md`.
- [x] Pytest coverage for both new modules and their Flask routes (14 new
      tests; 96 total).
- [ ] Codex has implemented and visually verified all four frontend surfaces
      against this contract (frontend-owned; tracked in Codex's own entries).

### Verification commands

```bash
python -m pip check
python -m pytest -q
npm --prefix aman_frontend test
npm --prefix aman_frontend run build
bash -n scripts/create_kb.sh scripts/run_evals.sh scripts/smoke_frontend_api.sh
scripts/create_kb.sh --list >/dev/null
scripts/run_evals.sh --check
git diff --check
```

### Final acceptance status

- [x] Strict local parser and real v3/v4/v5 validation.
- [x] Privacy-safe deterministic API and complete guided report.
- [x] Non-medical default-deny boundaries and honest limitations.
- [x] Evidence-audited trait layer, population context, chart, and studies.
- [x] Responsive accessible frontend and local production-path visual QA.
- [x] Automated Python/frontend checks and submission-document scaffolds.
- [x] Live DigitalOcean App Platform frontend, homepage, health, and invalid-upload proof.
- [x] Backend cohort-comparison and population-map endpoints, plus connection
      spec, for Codex's four-surface frontend redesign.
- [ ] Live DigitalOcean AI agent, Knowledge Base, guardrails, retrieval citations, and valid-upload proof.
- [ ] Codex's four-surface frontend redesign implemented and visually verified.
- [ ] Final live screenshots, demo recording, and Devpost submission.
