# Submission and demo checklist

Local product checks were last rerun on 2026-07-11. DigitalOcean and publishing
checks remain intentionally open until the separate deployment handoff.

## Local product

- [ ] Container build succeeds after the Vite source rename to
      `aman_frontend/`, while Flask still receives `/app/frontend/dist`.
- [ ] YC-inspired four-surface shell renders overview, trait network, 3D globe,
      and research workspace at desktop and mobile widths. Desktop production-
      build structure/controls and the rebuilt WebGL fallback pass automated
      checks; mobile browser verification remains.
- [x] Backend endpoints for the trait-network (`/api/comparison-cohort`) and
      globe (`/api/population-map`) surfaces are implemented and return a
      mandatory `disclaimer`/`citations` payload.
- [ ] Frontend renders the trait-network as explicitly synthetic and the globe
      as real cited reference populations, using each response's `disclaimer`.
      Both safe adapters and same-origin API calls are implemented and covered
      by 21 passing frontend tests; production-build visual verification remains.
- [x] Frontend/backend integration contract is documented and locally checked,
      including the `/api/comparison-cohort` and `/api/population-map`
      endpoint specs for the trait-network and 3D globe surfaces.
- [x] Full Python test suite passes (96 tests, including new coverage for
      `backend/comparison.py`, `backend/population_map.py`, and their routes).
- [x] React production build passes.
- [x] A valid PGP 23andMe export produces the complete guided report.
- [x] Invalid, empty, renamed, and non-23andMe files fail safely.
- [x] Representative v3, v4, and v5 exports parse without crashing.
- [x] MT and Y rows, no-calls, duplicate markers, and malformed rows are handled.
- [x] The broad population label is visibly user-supplied and optional.
- [x] Only allowlisted non-medical variants receive interpretations.
- [x] Off-allowlist/APOE/BRCA examples produce the default-deny response.
- [x] Missing chip markers say “not measured,” not “does not have the trait.”
- [x] Trait and chart citations open to the intended source.
- [x] Study status, consent/privacy text, and official links are visible.
- [x] No uploaded raw genotype data appears in logs or retained files.
- [x] Accessibility check: keyboard upload, visible focus, status announcements,
      contrast, responsive layout, and reduced motion.

## DigitalOcean handoff (owned separately)

- [ ] Rotate every model, agent, or control-plane credential pasted into a log.
- [x] Validate the App Platform specification with an authenticated account.
- [x] Set runtime secret entries in App Platform, never in Git.
- [ ] Verify the agent model, system prompt, and Sensitive-Data guardrail.
- [ ] Create/select the Knowledge Base, index sources, and attach it to the agent.
- [ ] Confirm retrieval contains source records for the prepared demo prompt.
- [ ] Confirm the live application renders retrieved citations.
- [x] Confirm serverless fallback behavior if the agent path is intentionally used.
- [x] Run live homepage, `/health`, and no-file invalid-upload checks.
- [x] Run a valid-upload check with an approved open-consent PGP demo file.
- [x] Record the live URL and deployment revision: `jellyfish-app-jbnoq.ondigitalocean.app`, commit `b0272fd`.

## Pitch and submission

- [ ] Replace every bracketed placeholder in `docs/demo-script.md` and slides.
- [ ] Capture final screenshots at desktop and mobile widths.
- [ ] Record a clean video under three minutes using only public demo data.
- [ ] Show the refusal/honest-limits moment.
- [ ] Show the reference-panel representation comparison and its citation.
- [ ] Name the DigitalOcean services actually verified—do not claim planned work.
- [ ] Add repository URL, live URL, video URL, team members, and credits to Devpost.
- [ ] Rehearse once from a clean browser session before judging.
