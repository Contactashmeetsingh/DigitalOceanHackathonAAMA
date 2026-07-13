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
The Gradient AI agent and managed Knowledge Base are provisioned, attached, and
successfully indexed. A direct production agent check returned grounded
retrieval evidence; the remaining six-category citation sweep is listed below
and is not claimed as complete until every category passes.

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

## Remaining release steps

The application implementation is complete. Completed production checks and the
only remaining post-hackathon release work are recorded here:

1. **Complete:** the targeted Knowledge Base indexing job
   `6a5794fc-7dbb-11f1-aee4-4e013e2ddde4` finished `SUCCEEDED`; both attached
   sources report `DATA_SOURCE_STATUS_UPDATED`, one indexed item each, and no
   failed items.
2. **Open:** ask all six vetted research questions against the deployed agent and confirm
   `answer_mode=agent_rag`, retrieval URLs, and visible Pillar 3 citations. Keep
   the amber ungrounded warning if any category returns no retrieval citation.
   Run `python scripts/verify_live_rag.py`; this check is currently waiting on
   external-execution approval after the session usage limit rejected the run.
3. **Complete:** the approved open-consent PGP v5 fixture passed against App
   Platform deployment `e3f80bc1-8f1f-4407-8134-6162904ad9a6` (commit
   `361d65b`) with `genetic_closeness.status=available`, 26 population rows,
   2,279 usable markers, deterministic reporting, and default-deny boundaries.
4. **Open:** capture/retain the final desktop and mobile submission screenshots
   and complete the Devpost video/team-credit fields.
5. **Complete:** removed the redundant 21 MB tracked `globe.gl/` reference clone;
   the application continues to use the pinned `globe.gl@2.46.1` npm package.

DigitalOcean currently grants presigned PDF uploads but rejects the documented
file-data-source object with HTTP 400. The staged PDFs are not claimed as
ingested; the source-linked crawler-safe dossier is the supported retrieval path.

## Iteration log

- **2026-07-12 — Redundant Globe.gl source clone removed (completed):**
  Confirmed no application import consumes the tracked
  `globe.gl/` source repository and that production uses the pinned
  `globe.gl@2.46.1` npm package. Removed all 81 redundant tracked files (21 MB)
  while preserving the runtime dependency, local Earth geometry, attribution,
  and application implementation. All 30 frontend tests, all 108 Python tests,
  the Vite production build, and `git diff --check` pass after removal.

- **2026-07-12 — Health-check concurrency fix (completed locally):** Confirmed
  deployment `61836d55-e602-45bf-895a-a448223f4c03` is ACTIVE from commit
  `0493cc2`. The first production smoke hit `no_healthy_upstream` while the
  only synchronous Gunicorn worker was occupied; the same smoke passed after
  that request released the worker. Kept one process to share the 1000 Genomes
  reference data within the 512 MB instance, but switched it to `gthread` with
  two threads so `/health` and deterministic API requests can run alongside a
  slow Gradient call. Added a deployment-artifact regression test. Deployment
  deployment completed as `2173c19d-d893-4dbc-95e4-1039c1d289af` from commit
  `3408312`, and the standard live health/API smoke passed. An overlapping
  long-model-request check remains before concurrent behavior is marked fully
  production-verified.

- **2026-07-11 — Post-hackathon production audit (local work complete; two
  external checks open):** Pulled nine upstream commits through `88ac611` and
  verified the merged Google-color, single-frontend, immersive-Earth release.
  The managed Knowledge Base indexing job
  `6a5794fc-7dbb-11f1-aee4-4e013e2ddde4` completed successfully with 2/2
  attached sources updated, one indexed item per source, and zero reported
  failures. `scripts/verify_do.py` passed serverless inference, control-plane
  visibility, credential separation, and a grounded production agent response
  containing retrieval evidence. Added `scripts/verify_live_rag.py` for a
  privacy-safe, six-category production sweep and hardened citation extraction
  for DigitalOcean retrieval metadata whose `item_name` or `filename` contains
  an HTTP(S) source URL; plain filenames remain rejected. All 107 Python tests,
  all 30 frontend tests, the Vite production build, and `git diff --check` pass.
  At that point, the six-category live sweep and deletion of the unused tracked
  `globe.gl/` source clone remained open because the execution-approval usage
  limit rejected those actions; the clone was removed in the later entry above.

- **2026-07-11 — Immersive Earth → Docker reference dataset (completed and
  live):**
  Traced the production reference path and confirmed Docker ships
  `data/reference/phase3_reference.json.gz`, while `/api/analyze` exposes its
  privacy-safe result as `genetic_closeness`. Added a renderer-safe adapter so
  the immersive Earth now prioritizes those 26 Phase 3 populations, exact
  reference sample counts, upload-specific RMS distance/rank, overlap metadata,
  official-description map anchors, caveats, and sources. The separate
  `/api/population-map` trait model remains only as a fallback. No marker list,
  genotype, inferred location, or ancestry percentage reaches the globe. All
  30 frontend tests, all 104 Python tests, the Vite production build,
  `git diff --check`, and a clean Docker build pass. The built image contains
  GRCh37 with 2,504 samples, 26 populations, and 19,979 variants. Posting the
  approved open-consent PGP v5 fixture to that container returned HTTP 200,
  `genetic_closeness.status=available`, 26 rows, and 2,279 usable markers.
  Commit `361d65b` activated in App Platform deployment
  `e3f80bc1-8f1f-4407-8134-6162904ad9a6`; the same approved fixture then
  returned those exact counts from the live API, and the deployed main,
  stylesheet, Globe.gl, and Three.js chunks all returned HTTP 200. A separate
  concurrent Gradient request briefly monopolized the app's single sync
  worker and produced a temporary no-healthy-upstream response; the service
  recovered without intervention and the repeated health/API/static smoke
  passed. That capacity concern belongs to the backend/DigitalOcean follow-up,
  not the Earth data adapter.

- **2026-07-11 — Full-viewport Globe.gl Earth experience (completed and live):**
  Added a new isolated `ImmersiveEarth` component based on the supplied
  `globe.gl` repository. The section fills the viewport below the sticky header,
  lazy-loads WebGL, renders local Natural Earth country geometry, supports
  orbit/zoom and accessible reference selection, and keeps a CSS fallback for
  WebGL-disabled browsers. The existing backend-connected Earth component is
  preserved untouched; the app shell changes only its import and mounted tag,
  so the newly committed `populationMapData` wiring continues through the same
  props. All 26 frontend tests and the Vite production build pass. The section
  was visually verified at 1440×1000 and 390×844, including the no-WebGL
  fallback; hardware-accelerated Chrome rendered the real Globe.gl scene and
  confirmed that selecting a reference updates the inspector and animates the
  camera. The Globe.gl engine remains lazy-loaded outside the initial bundle.
  A clean production Docker build also passes with a 2.12 MB build context; the
  supplied `globe.gl/` reference clone is excluded from that context because the
  app uses the pinned npm package. App Platform deployment
  `048054f5-068d-44cb-853e-4a6310a18ba7` activated commit `3175db3`; the live
  health/validation smoke passed without a genome or model request, and the
  deployed 488 KB Earth geometry plus 514 KB lazy Globe.gl chunk both return
  HTTP 200.

- **2026-07-11 — Single-frontend Google-color release (completed locally):**
  Removed the redundant generated `frontend/` tree so `aman_frontend/` is the
  sole Vite source. Replaced the black/purple presentation with a light
  Material-style system using Google blue (`#4285F4`), red (`#EA4335`), yellow
  (`#FBBC04`), and green (`#34A853`), including the real distance/Earth
  instrument, report, research room, focus states, warnings, and fallback graph
  palette. Desktop 1440px and responsive 500px headless-browser checks pass;
  all 24 frontend tests, 104 Python tests, the Vite production build, and
  `git diff --check` pass. App Platform activation and the live valid-upload
  replay remain in the release steps above.

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
- **2026-07-11 — 1000 Genomes runtime reference (completed):** Downloaded the
  user-specified PLINK 2 build-37 Phase 3 PGEN/PVAR/PSAM files and official IGSR
  population descriptions outside Git; verified 84,805,772 variants and 2,504
  samples across 26 population labels. Added a reproducible pipeline for 19,979
  common, non-palindromic, LD-pruned rsID SNPs and a 1.2 MB compressed runtime
  frequency artifact with input checksums, exact sample counts, approximate
  source-description map anchors, and a three-dimensional population-frequency
  MDS layout. Leave-one-out validation on the reference samples reached 99.24%
  superpopulation agreement with all 20,000 selected markers and 99.28% over
  the 2,841-marker open-consent v4-chip overlap; this is validation of the
  aggregate distance instrument, not authorization to infer a user's identity.
- **2026-07-11 — Privacy-safe closeness API (completed):** Added lazy loading of
  the compact Phase 3 reference, selected-marker retention, GRCh37 allele
  compatibility checks, and deterministic RMS allele-frequency distances for
  all 26 reference populations. The API returns only aggregate distances,
  overlap/mismatch counts, exact reference sample sizes, source-description map
  anchors, and explicit non-ancestry caveats; it returns no panel marker list or
  uploaded genotypes. Missing data, the wrong build, or fewer than 200 overlaps
  fail closed without breaking the report. All 85 Python tests pass, and a real
  open-consent v4 POST returned 2,836 compatible markers plus the existing six
  traits, default-deny refusal, transparency reveal, and four matched studies.
- **2026-07-11 — Integrated distance and Earth pillars (completed):** Replaced
  the planned-atlas card with a dependency-free SVG audit instrument in the
  production result: pointer orbit, wheel zoom, keyboard camera controls, 26
  selectable 3D distance nodes, source-description map anchors, TOPMed r2
  sample-count bubbles, shared cross-highlighting, persistent exact-N details,
  thin-panel amber/dashed warnings, provenance links, caveats, and a complete
  table fallback. Restyled the product as a dense graphite/cyan/amber evidence
  console while preserving reduced motion, forced colors, focus behavior, and
  responsive stacking. Seven frontend tests and the Vite build pass. Headless
  Chrome visual QA uploaded the real public v4 fixture, rendered `DISTANCE
  ONLINE` with 2,836/19,979 overlap, selected one node across both views, and
  confirmed the inspector and TOPMed 97,256 denominator on the built bundle.
- **2026-07-11 — Report and retrieval provenance polish (completed):** Kept the
  deterministic coverage/trait/refusal/transparency report as Pillar 3 and made
  every research-program match explain why it appears for the user-supplied
  broad context, with an explicit public-enrollment vs. consortium/controlled-
  data pathway field. Gradient agent answers now identify RAG vs. serverless
  fallback, recursively collect nested `include_retrieval_info` URLs plus inline
  source URLs, show the citation count inline, and display an amber verification
  warning when no retrieval citations return. The full suite now passes with 86
  Python tests, seven frontend tests, and a clean production build.
- **2026-07-11 — Managed genetics-literacy RAG corpus (partially verified):** Created
  `genetics-literacy-kb` in `tor1` with a DO-managed OpenSearch database and the
  GTE Large EN v1.5 embedding model; attached eight open full-text population-
  genetics sources and connected the KB to the deployed Gradient agent. Added
  reproducible, idempotent controls for creation, crawler application, sanitized
  PDF upload, indexing, status, and endpoint-matched agent attachment. Added
  open peer-reviewed Qatar Genome (Middle Eastern) and GLAD (admixed Latin
  American) sources to close explicit corpus gaps. The first indexing job is in
  progress; the presigned-PDF add-source request is currently rejected by the
  control plane and is recorded as a visible limitation rather than reported as
  ingested. The first crawler job was partial: ScienceDirect indexed, while all
  seven NCBI PMC URLs failed without API error detail. The manifest now uses
  Europe PMC open-full-text mirrors also returned not-updated. Added a
  crawler-safe, source-linked evidence dossier on `main` and narrowed targeted
  indexing to that dossier plus the publisher-hosted ScienceDirect source; the
  final targeted index and six-category citation replay remain required.
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
  reduced motion, forced colors, and responsive layouts are preserved;
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
- **2026-07-11 — 1000 Genomes hg38 extraction attempt superseded (discontinued):**
  Started extracting per-chromosome GRCh38 1000 Genomes allele frequencies for
  the 8 allowlisted trait rsids via a locally downloaded PLINK2 binary (user
  approved running it this session), to satisfy a request to make the 1000
  Genomes dataset available to the deployed app. Mid-extraction, found this had
  already been completed end-to-end on `main` (see the "1000 Genomes runtime
  reference" and "Privacy-safe closeness API" entries above): a GRCh37 build
  matching this app's required reference build, all 2,504 samples across 26
  populations, 19,979 LD-pruned rsIDs, wired into `backend/reference_panel.py`'s
  `genetic_closeness` field and live-verified in production (see the next entry).
  Discarded the scratchpad hg38 extraction without merging it — it used a
  different, incompatible build and would have duplicated already-shipped,
  more rigorous functionality.
- **2026-07-11 — Live step-4 verification against the current deployment
  (completed):** Re-ran the outstanding live valid-upload/refusal/narrative
  checks against the currently active deployment (commit `b0272fd`, deployment
  `1f630e84-5642-4bd6-860f-c958efe1270b`), using the approved open-consent v5
  PGP demo file (`data/samples/genome_Lorena_Sandoval_v5_Full_20260429131650.txt`).
  `POST /api/analyze` with `population_label=European` returned HTTP 200 with
  the complete deterministic report (618,277 called markers,
  `reference_build: GRCh37`) **and** a working `genetic_closeness` result from
  the newly live 1000 Genomes reference panel: `status: available`, 2,279/19,979
  markers overlapping, all 26 reference populations ranked (closest: PEL,
  Peruvian in Lima). Requesting the three off-allowlist rsids (`rs429358`,
  `rs7412` — APOE; `rs80357906` — BRCA) returned HTTP 200 with all three
  explicitly refused under the default-deny boundary. `POST /api/narrative`
  (`interpretation` category) returned HTTP 200 in ~108s via
  `answer_mode: serverless_fallback` (the agent leg was not reached inside the
  request window — expected, documented latency behavior) with an accurate,
  well-grounded answer and an empty `citations` array, which is the documented
  behavior for the serverless path, not evidence of populated retrieval
  citations from the agent+Knowledge Base path (that remains a separate open
  item below). No raw genome bytes were logged or retained by this
  verification, and no billable evaluation was started.
- **2026-07-11 — Trait network and Earth reference globe mounted into the app
  (completed, this agent, by explicit user request):** Deep-diving the UI
  changes pulled from Codex revealed `AncestryGlobe.jsx` and `TraitNetwork.jsx`
  were fully built and covered by 24 passing frontend tests, and
  `POST /api/comparison-cohort` / `POST /api/population-map` were already live
  and correct, but `App.jsx` never imported or rendered either component — the
  two surfaces were unreachable in production. The user explicitly authorized
  this backend/DigitalOcean-owned agent to cross into `aman_frontend/` for this
  one task rather than waiting on Codex. Fix: imported both components into
  `App.jsx`; added report-grounded, abortable data fetching for both endpoints
  (mirroring `ResearchWorkspace`'s abort/generation-guard pattern) that clears
  and refetches whenever the analyzed report changes; rendered both surfaces
  between the upload section and the research workspace so their existing
  "01 · Trait space" / "02 · Reference context" kickers land in the intended
  product order; added matching `#compare`/`#atlas` nav links. All 24 frontend
  tests still pass; `npm run build` succeeds. Committed and pushed as
  `d87b13e`, deployed as App Platform deployment `c163c596-66e2-4e57-823d-c3567d3fd80f`
  (ACTIVE, superseding `e6d7693`). Live-verified end-to-end: confirmed the
  live homepage serves the exact built bundle (`index-Sch3NTxR.js`, hash match
  with the local build) containing both new section headings; analyzed the
  approved open-consent PGP file
  (`genome_Lorena_Sandoval_v5_Full_20260429131650.txt`) against the live app
  (`genetic_closeness.status: available`); POSTed that exact live report to
  both new endpoints — `/api/comparison-cohort` returned 121 nodes/120 links
  with a disclaimer and 5 citations, `/api/population-map` returned 29
  populations with a `you_marker` that only echoed the user-supplied
  "European" label (never inferred) plus a disclaimer. **Not done:** no
  browser-automation tool was available this session, so the actual WebGL/3D
  canvas rendering (the force-graph and rotating globe) was not visually
  screenshotted or interacted with in a real browser — a human or Codex visual
  QA pass on the live `#compare`/`#atlas` sections is still recommended before
  final submission.

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

## Technical architecture (backend deep dive)

This section explains *how the backend actually works*, module by module and
algorithm by algorithm — for wire-format request/response shapes (exact JSON,
HTTP codes, error `code` values), see
[`docs/frontend-backend-contract.md`](docs/frontend-backend-contract.md)
instead; this section explains the "why" and the internals behind that
contract.

### Request pipeline for `POST /api/analyze`

```text
multipart upload
  └── InMemoryUploadRequest._get_file_stream()   (backend/upload_request.py)
        forces the file part into a BytesIO, never Werkzeug's default
        disk-spooling temp file (which spills past 500 KiB — genome files
        are always 15-25 MB)
  └── app.py: filename/extension check -> decode utf-8-sig (strips BOM)
  └── parser.parse_23andme(require_vendor_header=True,
        retain_rsids=ALLOWLIST ∪ reference_rsids())     (backend/parser.py)
        -> ParseResult {snps, stats, coverage, retention, chip_version,
                        reference_build, vendor}
  ├── traits.lookup(parsed)                              (backend/traits.py)
  │     -> per-SNP interpretation rows (see below)
  ├── ancestry.build_context(population_label, trait_hits, requested_rsids)
  │     -> normalized population label + boundaries.screen_requested_rsids()
  ├── report.build_guided_report(...)                     (backend/report.py)
  │     -> stitches traits + context + coverage + transparency + studies
  │        into one deterministic JSON object (REPORT_VERSION "1.0")
  └── reference_panel.build_closeness(parsed)     (backend/reference_panel.py)
        -> computed independently, merged into the same top-level response
           as `genetic_closeness`
```

Everything downstream of `/api/analyze` (`/api/narrative`,
`/api/comparison-cohort`, `/api/population-map`) takes that **already-returned
report JSON** as input — never a raw file again. This is the single most
load-bearing architectural decision in the backend: every new AI/visualization
feature automatically inherits the same parser validation, SNP allowlist, and
boundary checks without re-implementing them, because it can only ever see
data that already passed through that pipeline once.

### `backend/parser.py` — the parsing engine

- `_iter_lines()` walks the decoded text with string `find`/slicing instead of
  `str.splitlines()`, so it never materializes a second list proportional to
  file size.
- Header sniffing: `_leading_comments()` collects the `#`-prefixed lines before
  the first data row. `_OFFICIAL_VENDOR_RE` requires the literal 23andMe
  attestation phrasing ("this data file ... generated by 23andMe");
  `_OTHER_VENDOR_RE` positively detects competing-vendor mentions
  (AncestryDNA, MyHeritage, FamilyTreeDNA, LivingDNA) and refuses those
  **even in non-strict mode**; `_has_column_header()` requires the canonical
  `rsid chromosome position genotype` comment line.
- Row validation (`_normalized_record`): exactly 4 tab-separated columns;
  marker id matches `(?:rs|i)[1-9]\d{0,19}` (the 20-digit cap exists
  specifically to keep Python's big-int parsing bounded against a hostile
  input); chromosome must be one of `1..22, X, Y, MT`; position is 1-12
  digits and `> 0`; genotype is `-`, `--`, or 1-2 letters from `ACGTDI`
  (`D`/`I` cover indel calls).
- **Retention modes** are the memory-bounding mechanism: `retain_all` (the
  default, `retain_rsids=None`) keeps every valid record's genotype in RAM.
  `/api/analyze` instead passes `retain_rsids = ALLOWLIST ∪ reference_rsids()`
  — every row is still counted toward `stats`/`coverage`, but only genotype
  payloads for markers in that set are ever stored. This dropped v5-file peak
  parser RSS from ~426 MB to ~133 MB (see Iteration log). In selected mode,
  duplicate/conflict detection can't just dict-compare full records for every
  seen marker (that would defeat the memory saving), so `_marker_key()`
  encodes each validated `rs`/`i` id injectively into one compact integer
  (`(number << 1) | is_i_prefixed`) and duplicate detection uses a `set[int]`
  instead — exact duplicate/conflict counts survive without retaining
  unretained payloads.
- Chip version and reference build are **only** read from explicit header
  text (`_CHIP_VERSION_RE`, `_reference_build()` matching GRCh36/37/38 and
  their `hg18/hg19/hg38` aliases) — never guessed from marker count, because
  that guess would be unreliable across chip revisions.
- Output shape: `snps` (dict keyed by lowercased marker id), `stats`
  (`total/called/no_calls/malformed/duplicates/conflicting_duplicates/input_rows`),
  `coverage` (`call_rate` + per-chromosome breakdown), `retention` metadata,
  `chip_version`, `reference_build`, `vendor`.
- `genotype_for(parsed, rsid)` is the one lookup helper every other module
  uses; case-insensitive, treats `-`/`--` as "not called" (`None`).

### `backend/traits.py` — the curated SNP allowlist (the actual interpretation engine)

- `ALLOWLIST` is a literal dict of the vetted SNPs, each with `genotype_meanings`
  (exact 2-letter genotype → plain-language sentence), an
  `european_validation_note` evidence caveat, and `citation`/`additional_citations`.
- `lookup(parsed)` canonicalizes each genotype by sorting its two alleles
  alphabetically (so raw-strand quirks like `AG` vs `GA` both hit the same
  mapping key), then branches: not measured on this chip → `not_measured`;
  measured but `reference_build != GRCh37` → `unverified_reference_build`
  (fails closed rather than assigning a meaning curated for a different
  build/strand orientation); genotype found in the mapping → `interpreted`;
  measured but the genotype isn't in the curated mapping (a rare/miscalled
  allele) → `unmapped_genotype`.
- **TAS2R38 special case**: 3 physically separate markers (`rs713598`,
  `rs1726866`, `rs10246939`) only mean something jointly as a haplotype (PAV
  = bitter-sensitive, AVI = less-sensitive). `_tas2r38_result()` requires all
  3 measured + GRCh37, then checks whether the canonicalized 3-marker tuple
  is an exact all-PAV-homozygous or all-AVI-homozygous match. Anything else
  (heterozygous mix, partial haplotype) is deliberately reported
  `unresolved_haplotype` rather than guessed — raw consumer arrays are
  unphased, so 3 independent genotype calls can't safely be collapsed into
  one diplotype.

### `backend/boundaries.py` — default-deny policy

- `traits.ALLOWLIST` membership **is** the policy. `is_allowed()` tests
  membership; anything else always refuses via `refuse()` with one fixed,
  content-neutral `REFUSAL_MESSAGE` — no per-marker explanation is ever
  generated, specifically so nothing about an off-allowlist marker (e.g. an
  APOE or BRCA rsid) is synthesized or implied by the refusal itself.
- `screen_requested_rsids()` backs the `requested_rsid` regression-test
  surface on `/api/analyze`: normalizes (`rs[0-9]+`, casefolded), dedupes,
  splits into `allowed_rsids` vs `refusals`, and **always** attaches the 3
  fixed `honesty_responses()` (health_risk / ancestry_reinference /
  exact_ethnicity) regardless of what was actually requested, so the report's
  limitations card is always fully populated.

### `backend/ancestry.py` — user-supplied population label (context only, never inferred)

- `normalize_population_label()` cleans/truncates the input (120 chars max),
  then does **exact alias-set membership** — not substring or fuzzy matching
  — against ~10 canonical buckets. The code comment is explicit about why:
  substring matching could turn a phrase like *"not South Asian"* into a
  population assignment.
- The function signature itself is the actual privacy mechanism here — it
  only ever receives the label string, never parsed genotype data, so "this
  label is context, not a DNA inference" is structurally true rather than
  merely documented. Output always carries `inferred_from_dna: false`.

### `backend/report.py` — deterministic report assembly

- `build_guided_report()` is pure: given the same parsed input and the same
  `population_label` string, it produces byte-identical JSON — no
  randomness, no clock, no model call. This is what makes the guided report a
  safe demo path independent of any DigitalOcean credential.
- Builds the `transparency` section carrying the project's actual thesis
  ("Coverage is not the same as certainty") plus a `population_note` that is
  one of 3 fixed sentences depending on whether a label was supplied/recognized.

### `backend/reference_panel.py` — genetic closeness vs. 1000 Genomes (the "audit" instrument)

- Loads a gzip'd JSON artifact (`data/reference/phase3_reference.json.gz`,
  ~1.2 MB, baked into the Docker image) once per process via
  `@lru_cache(maxsize=1)`.
- **The actual algorithm**: for each of the panel's 19,979 LD-pruned,
  common, non-palindromic SNPs (26 named 1000 Genomes populations, each with
  a scaled alt-allele frequency), if the upload has a called genotype at
  that rsid, compute `alternate_fraction = count(alt allele) / 2` (0, 0.5, or
  1) and accumulate the squared difference against every population's known
  alt frequency. After the loop, each population's distance is
  `sqrt(mean squared difference)` — an RMS allele-frequency distance over
  whatever markers happen to overlap this chip. Populations are then ranked
  ascending by distance (rank 1 = smallest distance).
- Fails closed at 3 gates, in order: reference artifact missing/corrupt →
  `reference_unavailable`; `reference_build != GRCh37` → `incompatible_build`
  (distance is never computed on a build mismatch, since allele orientation
  could be flipped); `usable_markers < minimum_overlap` (200) →
  `insufficient_overlap`. Otherwise `status: available`.
- The response can never leak the panel's marker list or the user's
  genotypes — only aggregate distances/overlap counts/ranks — because the
  per-marker loop's intermediate state never leaves the function.

### `backend/comparison.py` + `backend/population_map.py` — the two visualization data sources

Both modules import the **same** published, cited allele-frequency tables
(`LACTASE_FREQUENCIES`, `EARWAX_FREQUENCIES`, `ACTN3_FREQUENCIES`,
`TAS2R38_FREQUENCIES`) and the same broad-population bucket keys, so the
trait card, the synthetic cohort graph, and the real-population globe are all
grounded in one source of truth reused three ways.

- `user_trait_genotypes(report)` (shared by both modules) walks
  `report.traits.items`, keeps only `interpretable` results, canonicalizes
  TAS2R38 into a single `tas2r38: "pav_pav"|"avi_avi"` key (dropping
  unresolved/partial haplotypes — only clean homozygous calls are usable for
  comparison), and sorts each genotype string.
- **`comparison.py`** (`/api/comparison-cohort`, feeds `TraitNetwork`):
  `_seed_from_report()` hashes `(input_rows, called, no_calls, duplicates,
  chip_version)` from the report's own stats into a fixed seed for
  `random.Random` — no client-supplied seed, no server-side storage, yet "the
  same analyzed file always produces the same graph." Cohort composition
  (120 synthetic nodes across 9 broad groups) is fixed by `GROUP_SHARES`;
  each synthetic node's genotype per trait is drawn via weighted random
  choice from that group's real published class frequencies. The 2 traits
  with no defensible population gradient (photic sneeze, cilantro) are drawn
  uniformly and excluded from scoring. `link.value` = fraction of comparable
  (non-uniform) markers where the synthetic node's genotype equals the user's.
  Only the `"you"` node is real; every other node carries `is_synthetic: true`
  and the response carries a mandatory `disclaimer`.
- **`population_map.py`** (`/api/population-map`, feeds `AncestryGlobe`/
  `ImmersiveEarth`): instead of drawing a random cohort, computes one
  `_expected_similarity(user_genotypes, group)` per real, named 1000
  Genomes/HGDP reference population = mean matched-frequency across whichever
  of the 4 gradient-bearing traits the user has interpretable results for.
  The `you_marker` is the only DNA-adjacent-looking element, and it is
  deliberately dumb: it's set only if `population_context.canonical_key` (a
  string the user typed, from the existing `/api/analyze` flow) matches one
  of the reference rows' `group` field. No genotype is involved in placing
  it — the backend never fabricates a location from DNA.

### `backend/narrative.py` + `backend/gradient_client.py` — the optional AI layer

- **`narrative.py`**: `CATEGORY_QUESTIONS` hardcodes the exact question text
  server-side for 6 fixed category ids — the client only ever sends a
  category id, never freeform text, so there is no prompt-injection surface
  via user-authored questions. `_safe_context()` is a second, independent
  allowlist projection of the report (only `name`/`rsid`/`measured`/
  `interpretable`/`interpretation`/`evidence_note` per trait, plus population
  label fields, the boundaries policy summary, and study program names) —
  even though the caller passes the entire previously-returned report object,
  only these specific fields are ever transcribed into the model prompt.
- **`gradient_client.py`**: two independent paths tried in order.
  1. **Agent/RAG path**: `POST {GRADIENT_AGENT_ENDPOINT}/api/v1/chat/completions?agent=true`
     — the `?agent=true` query param is required; the bare path silently does
     not route to the agent/RAG handler (a real production bug this project
     hit and fixed live). System/developer-role messages are stripped before
     sending, because the DO agent API hard-rejects them
     (`"system and developer messages are not allowed"`, HTTP 400) — agent
     instructions are configured server-side in the console instead; only the
     user turn (question + JSON context) is sent.
  2. **Serverless fallback**: an OpenAI-compatible client against
     `https://inference.do-ai.run/v1/` with `DIGITAL_OCEAN_MODEL_ACCESS_KEY`,
     model `anthropic-claude-4.6-sonnet`, sending the full original message
     list (no server-side agent config to conflict with). An explicit
     `http_client=DefaultHttpxClient(...)` works around an openai
     1.51.0/httpx incompatibility (`proxies` kwarg removed upstream).
  `explain()` tries the agent path only if both `GRADIENT_AGENT_ENDPOINT` and
  `AGENT_ACCESS_KEY` are set; on failure it falls back to serverless only if
  a model key is also configured, else re-raises; if neither path is
  configured, it raises `NarrativeUnavailable` immediately (→ HTTP 502
  `narrative_unavailable`). `_extract_citations()` defensively walks the
  agent's `retrieval_info`-shaped payload (key names aren't pinned in DO's
  public docs) plus a regex sweep for inline URLs in the answer text, and
  always degrades to an empty list rather than raising — matching the
  documented "empty `citations` is a valid success response" contract. Both
  paths return `{"content", "citations", "answer_mode"}`, where `answer_mode`
  (`"agent_rag"` vs `"serverless_fallback"`) is how the frontend can honestly
  label whether an answer is retrieval-grounded.

### `backend/upload_request.py` — the privacy mechanism, in one class

Overrides Flask's default multipart file-stream factory so uploaded bytes
land in a `BytesIO` instead of Werkzeug's default `SpooledTemporaryFile`
(which spills to the OS temp **disk** past 500 KiB — genome files are always
15-25 MB, so without this override every upload would silently touch disk).
Combined with `MAX_CONTENT_LENGTH = 64 MB` and never writing the raw text
anywhere else, this is what makes "processes uploads in memory, never
persists them" literally true rather than aspirational.

### Deployment architecture

- **Multi-stage `Dockerfile`**: stage 1 (`node:20-slim`) runs `npm install` +
  `vite build` of `aman_frontend/` → `dist/`; stage 2 (`python:3.11-slim`)
  installs backend deps, copies `backend/`, the reference-panel data,
  `studies.json`, and stage 1's `dist/` output, then runs
  one memory-sharing Gunicorn `gthread` worker with two threads and a 120s
  timeout (headroom over `gradient_client`'s 90s request timeout). This keeps
  `/health` responsive while one thread waits on Gradient without duplicating
  the in-memory reference panel across processes.
- **App Platform spec** (`.do/app.yaml`): a single `web` service built
  directly from that Dockerfile, `deploy_on_push: true` from `origin/main`
  (no separate release/staging branch — every push to `main` that builds is
  live), health check on `/health`, and 3 runtime env vars
  (`DIGITAL_OCEAN_MODEL_ACCESS_KEY` + `AGENT_ACCESS_KEY` typed `SECRET` —
  never in git; `GRADIENT_AGENT_ENDPOINT` as a plain value since the URL
  itself isn't sensitive).
- Because deploys are push-triggered off `main` with no staging branch, the
  "Active collaboration protocol" section above (own commits, never bundle
  another owner's dirty files) is the actual mechanism keeping two
  concurrently-editing agents from shipping half-finished or conflicting work
  straight to the same production origin.

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

- [x] Three-pillar frontend redesign is implemented and visually verified at
      desktop and responsive mobile widths in the Google-color theme.
- [x] The Dockerfile follows the `aman_frontend/` source rename and
      still places the production bundle at Flask's `/app/frontend/dist` path.
- [x] The real 1000 Genomes distance and Earth views render their aggregate
      source metadata, caveats, sample counts, and shared selection state.
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
- Real open-consent PGP v3/v4/v5 API validation, 107 Python tests, 30 Node
  data/interaction tests, a successful production build, and local visual QA.
- [x] `/api/comparison-cohort` (synthetic, cited cohort graph) and
      `/api/population-map` (real, cited reference populations) backend
      endpoints, documented in `docs/frontend-backend-contract.md`, for
      Codex's 3D force-graph and 3D globe surfaces.

### DigitalOcean deployment and AI handoff

The App Platform frontend is live at
[jellyfish-app-jbnoq.ondigitalocean.app](https://jellyfish-app-jbnoq.ondigitalocean.app)
from verified deployment `e3f80bc1-8f1f-4407-8134-6162904ad9a6`
(commit `361d65b`, ACTIVE) with deploy-on-push from `origin/main`. The immersive
Earth release passed live health, validation-error, static-geometry, lazy
Globe.gl-chunk, and approved open-consent PGP v5 checks.
The prepared local artifacts for remaining AI work are `.env.example`,
`agent/system_prompt.md`, `data/kb_sources/`, `scripts/create_kb.sh`,
`evals/agent_behavior.jsonl`, and `scripts/run_evals.sh`.

- [ ] Rotate every model, agent, or control-plane credential pasted into any log.
- [x] Validate the App Platform spec and configure its runtime secret entries.
- [x] Deploy the current repository revision and record the live URL/revision.
- [x] Create/select the agent and verify its model, prompt, and guardrail settings.
- [x] Create the managed `genetics-literacy-kb` and attach it to the deployed
      Gradient agent.
- [x] Finish the targeted evidence-dossier index; the final job succeeded with
      2/2 attached sources indexed and no reported source failures.
- [ ] Verify retrieval citations on all six demo prompts with
      `python scripts/verify_live_rag.py`.
- [x] Finish and test the optional `backend/gradient_client.py` agent response
      and retrieval-citation mapping before advertising model-generated answers.
      Agent-path 400 (system/developer messages rejected) root-caused, fixed,
      tested, and deployed live 2026-07-11; see Iteration log. The index and a
      direct grounded response now pass; the six-category sweep remains open.
- [x] Run live homepage, `/health`, and no-file invalid-upload smoke checks.
- [x] Run a live valid-upload test with an approved open-consent PGP file, then
      test citations, default-deny refusal, and fallback behavior. Start a
      billable evaluation only with explicit approval and manually review its
      judge rationales. Done 2026-07-11 against deployment `1f630e84` (commit
      `b0272fd`) — valid upload, default-deny refusal, and the documented
      serverless-fallback citations behavior all confirmed live; see Iteration
      log. No billable evaluation was started.

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
- [x] All four planned frontend surfaces are implemented and mounted in
      `App.jsx` (visual overhaul, `TraitNetwork` force-graph, `AncestryGlobe`
      Earth reference map, and `ResearchWorkspace` chat), each backed by its
      contracted endpoint and live-verified end-to-end 2026-07-11 (this agent,
      by explicit user request — see Iteration log). 24 frontend tests and the
      production build pass.
- [ ] Actual in-browser WebGL/3D visual QA of the live `#compare` (trait
      network) and `#atlas` (Earth globe) canvases — no browser-automation
      tool was available this pass; a human or Codex visual check remains.

### Verification commands

```bash
python -m pip check
python -m pytest -q
python scripts/verify_live_rag.py     # live model calls; run deliberately
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
- [ ] Live DigitalOcean AI agent, Knowledge Base, guardrails, retrieval citations,
      and valid-upload proof (all complete except the six-category citation sweep).
- [ ] Codex's four-surface frontend redesign is implemented and responsive/theme
      verified; final live WebGL QA of the comparison canvas remains open.
- [ ] Final live screenshots, demo recording, and Devpost submission.
