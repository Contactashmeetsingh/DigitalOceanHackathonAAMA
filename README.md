# Ancestry Audit Layer

An interpretation & transparency layer on top of consumer DNA results. Upload a
23andMe raw file and get a plain-language explanation of what it tells you — and,
crucially, **why the answer is vague if you're not of European descent**
(reference-panel bias). We are *not* an ancestry tool; we are an audit layer for
ancestry tools.

Built for **AI for Social Good — Hack with MLH & DigitalOcean** (SF, Jul 10–11 2026)
on the **DigitalOcean Gradient AI Platform**.

## Iteration log

- **2026-07-11 — Reference-panel visualization (started):** Verify a single
  comparable population-composition dataset, add a lightweight accessible chart
  that makes representation imbalance legible, label denominators and source
  dates, and keep historical GWAS metrics separate from reference-sample bars.
- **2026-07-11 — Reference-panel visualization (completed):** Added an
  accessible, dependency-free TOPMed r2 sample-count chart with a shared 97,256
  denominator, selectable comparison highlight, per-bar primary citations, and
  explicit label/coverage caveats. Kept the historical 96%-of-GWAS metric in a
  separately sourced context card. Confirmed with a Vite production build and
  all five parser tests.
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

## Hard boundaries (by design, not just policy)
- No ancestry inference — interpretation only.
- No health/disease claims — traits are illustrative and non-medical only.
- No fine-grained ethnicity claims beyond what the literature supports.
- Privacy-first: uploaded files are processed **in memory and never stored**.

## Data ethics
Demo data is from the **Harvard Personal Genome Project** (open-consent, public).
The PGP dataset is itself majority-European — it is our own Exhibit A for the bias.

## Run locally

Backend (Flask API):
```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in keys when available (optional for step one)
python -m backend.app          # API on http://localhost:8080 (PORT=8091 if 8080 is busy)
python -m pytest -q            # run parser tests
```

Frontend (React + Vite):
```bash
cd frontend && npm install
npm run dev                    # dev server on http://localhost:5173, proxies /api to Flask
# or build the production bundle that Flask serves:
npm run build                  # -> frontend/dist, served by Flask at /
```

## Deploy (DigitalOcean App Platform)
```bash
doctl auth init                          # paste a dop_v1_* token
doctl apps create --spec .do/app.yaml    # deploys from GitHub, autodeploy on push
```
Runs via `gunicorn --timeout 120 backend.app:app` on port 8080 (see `Dockerfile`).

## DigitalOcean Gradient AI
Three separate credentials (see `.env.example`): a **model access key** (serverless
inference / fallback), an **agent access key** (RAG agent endpoint), and a
**`dop_v1_*` token** (control-plane, e.g. Knowledge Base creation). The agent is
called at `$GRADIENT_AGENT_ENDPOINT/api/v1/chat/completions` with
`include_retrieval_info: true` for citations. Only the **Sensitive-Data** guardrail
is attached (Content-Moderation false-positives on genomic text).

## Build status & roadmap

### ✅ Completed (Step 1 + React conversion)
- **Repo scaffold & deploy config** — multi-stage `Dockerfile` (Node builds React → Python serves it), App Platform spec (`.do/app.yaml`), `.env.example` with the three credentials separated, `requirements.txt`.
- **23andMe parser** (`backend/parser.py`) — reads the real TSV format, handles the `#` header block, no-calls (`--`), malformed lines, and treats a missing rsID as "not measured on your chip." **5/5 parser tests pass.**
- **React (Vite) upload UI** (`frontend/`) — drag-and-drop, theme-aware, privacy notice; Flask serves the built bundle so it stays one service on one URL.
- **Working pipeline** — upload → parse → stats, verified through the production `gunicorn backend.app:app` entrypoint.
- **Skeletons with contracts + TODOs** for every remaining module (`traits`, `boundaries`, `ancestry`, `gradient_client`, `studies`), plus the agent system prompt draft, KB scripts, and `doctl` installed.

### ⏳ Remaining — Spine (must-have for the demo)
Each step is gated behind the parse that already works.

2. **Deploy live** *(P3)* — run `doctl auth init` (needs a `dop_v1_*` token), then `doctl apps create --spec .do/app.yaml`. Get the `.ondigitalocean.app` URL up **early** so there's always something demoable.
3. **Real test data + parser hardening** *(P1)* — download 2–3 real PGP files (one non-European-labeled as the contrast case); harden the parser for chip version (v3/v4/v5), genetic-sex (XX/XY), and MT/Y rows against them.
4. **Cited trait allowlist** *(P1)* — the heart of the project. Fill `traits.py` with 6–8 vetted **non-medical** SNPs (lactase persistence, earwax, PTC bitter taste, photic sneeze…), each with a genotype→meaning map **and a cited "validated in ~X% European cohort → why the inference is weaker for your group" line.**
5. **Default-deny refusal** *(P1)* — `boundaries.py` refuses anything not on the allowlist (covers APOE/BRCA automatically) and encodes the "honesty" answers: no finer breakdown, no health risk, no exact ethnicity beyond the literature.
6. **Ancestry context** *(P1)* — normalize the broad label the user's test already gave them and assemble the query context object.
7. **Deterministic guided report** *(P1+P3)* — the demo centerpiece: wire parse → traits → refusals → the "why it's vague for your group" reveal → studies into `/api/analyze`, and render it in the React UI. Renders identically every time (no live-chat variance).
8. **Provision + wire the Gradient AI agent** *(P2)* — create the agent (console or `doctl genai`), attach the **Sensitive-Data** guardrail, paste in `agent/system_prompt.md`; implement `gradient_client.explain()` (agent path with `include_retrieval_info` citations, serverless-inference fallback). Put the agent keys in `.env`.
9. **Studies bridge** *(P4)* — expand `studies.json`, match by population, render in the UI (clearly dated / "verify before acting").
10. **GO/NO-GO checkpoint (~hour 10)** — full spine works end-to-end on the live URL. Green → start stretch. Not green → freeze scope and polish the spine.

### 🌟 Remaining — Stretch (only after the checkpoint is green)
11. **Real Knowledge Base** *(P2)* — web-crawler data sources over population-genetics pages (see `data/kb_sources/README.md`) → enables the free-form **6-category chat** (interpretation · reference-panel transparency · population history · trait validation · research bridge · meta/honesty).
12. **Reference-panel bias bar chart** — sample counts by population; targets the *Best Use of Data* track.
13. **Expand the SNP allowlist** and add **agent evaluation tests** (targets the *Technology* criterion).

### 📣 Remaining — Pitch & docs
14. **Finalize** *(P4)* — README polish, the required **3-minute demo video** (problem → live demo → the refusal/"why vague" moment → DO stack callout), and 3–4 slides.

### ✔️ Pre-submission verification
1. Parser handles `--`, header, absent rsID, and v3/v4/v5 without crashing.
2. An APOE/BRCA rsID is refused by default-deny.
3. Agent returns a cited narrative; Sensitive-Data guardrail doesn't block genomic text; fallback works with `AGENT_ENDPOINT` unset.
4. Live end-to-end on the `.ondigitalocean.app` URL — rehearse this path.
5. Uploaded files are processed in memory, never persisted.
