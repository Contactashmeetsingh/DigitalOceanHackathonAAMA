# Submission and demo checklist

Local product checks were last rerun on 2026-07-11. DigitalOcean retrieval and
publishing checks remain intentionally open until the final targeted index.

## Local product

- [x] Docker packaging follows the Vite source rename to
      `aman_frontend/`, while Flask still receives `/app/frontend/dist`.
- [x] The sole `aman_frontend/` app renders the overview, real reference-distance
      and Earth instrument, report, and research workspace in the Google-color
      theme at 1440px and a responsive 500px viewport.
- [x] Backend endpoints for the trait-network (`/api/comparison-cohort`) and
      globe (`/api/population-map`) surfaces are implemented and return a
      mandatory `disclaimer`/`citations` payload.
- [x] Frontend renders the trait-network as explicitly synthetic and the globe
      as real cited reference populations, using each response's `disclaimer`.
      Both are now mounted in `App.jsx` (previously built and tested but never
      rendered) and live-verified end-to-end against the deployed API
      2026-07-11 (commit `d87b13e`, deployment `c163c596`). The replacement
      full-viewport Globe.gl Earth UI preserves that same data contract; 26
      frontend tests and the production build pass. Hardware-accelerated Chrome
      rendered the real scene and verified reference selection/camera movement;
      desktop/mobile and no-WebGL fallback layouts were also checked locally.
      Released through commit `3175db3`, deployment `048054f5`; live health,
      validation, Earth-geometry, and lazy Globe.gl-chunk checks pass.
- [x] Frontend/backend integration contract is documented and locally checked,
      including the `/api/comparison-cohort` and `/api/population-map`
      endpoint specs for the trait-network and 3D globe surfaces.
- [x] Full Python test suite passes (104 tests, including deployment-artifact,
      current 23andMe header, reference-panel,
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
- [x] Create the managed Knowledge Base and attach it to the deployed agent.
- [ ] Complete the crawler-safe evidence-dossier index.
- [ ] Confirm retrieval contains source records for the prepared demo prompt.
- [ ] Confirm the live application renders retrieved citations.
- [x] Confirm serverless fallback behavior if the agent path is intentionally used.
- [x] Run live homepage, `/health`, and no-file invalid-upload checks.
- [x] Run a valid-upload check with an approved open-consent PGP demo file.
- [x] Record the live URL and deployment revision: `jellyfish-app-jbnoq.ondigitalocean.app`, commit `3175db3` (deployment `048054f5`).

## Pitch and submission

- [ ] Replace every bracketed placeholder in `docs/demo-script.md` and slides.
- [ ] Capture final screenshots at desktop and mobile widths.
- [ ] Record a clean video under three minutes using only public demo data.
- [ ] Show the refusal/honest-limits moment.
- [ ] Show the reference-panel representation comparison and its citation.
- [ ] Name the DigitalOcean services actually verified—do not claim planned work.
- [ ] Add repository URL, live URL, video URL, team members, and credits to Devpost.
- [ ] Rehearse once from a clean browser session before judging.
