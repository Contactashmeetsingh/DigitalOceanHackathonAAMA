# 🧬 Ancestry Audit Layer — An Honesty Layer for Consumer DNA Results

### 🌍 Inspiration

Consumer DNA reports look scientific and precise — but that precision is not
evenly earned. Reference panels and genome-wide association studies have
historically over-represented European-ancestry populations, which means the
same test can give a confident, specific answer for one person and a vague,
low-confidence one for another, with no explanation of *why*. That gap is
usually invisible to the person reading the report.

We built for **AI for Social Good — Hack with MLH & DigitalOcean** (San
Francisco, Jul 10–11 2026) because this is exactly the kind of quiet,
structural unfairness AI can help surface rather than hide. We didn't want to
build another ancestry predictor — we wanted to build the tool that audits
one: something that tells people where their result's certainty actually
ends, and why.

---

### 🧠 What We Built

**Ancestry Audit Layer** takes a real, exported 23andMe raw-data file and
returns a **deterministic, plain-language guided report** that explains what
the data can and cannot responsibly support — plus a Gradient-AI-powered
research layer for going deeper.

1. **Upload** your exported 23andMe `.txt` file (or use one of our
   open-consent Harvard Personal Genome Project demo files).
2. The backend validates the file, retains only an explicitly reviewed,
   non-medical trait allowlist, and assembles a **complete, reproducible
   report**: measured/withheld/missing traits with citations, a
   reference-panel representation chart, honesty boundaries, and a dated
   bridge to real inclusive genomics research programs.
3. Ask **Gradient AI** one of six vetted questions (interpretation,
   reference-panel bias, history, traits, research, limits) and get a
   grounded, cited answer — never a free-form prompt injection surface.
4. Explore two visualization surfaces built on top of the same report: a 3D
   force-graph comparing your measured traits against an illustrative,
   clearly-labeled synthetic cohort, and a 3D globe of **real, named** 1000
   Genomes Project / Human Genome Diversity Project reference populations
   with an expected genetic similarity to your own data.

Every one of those surfaces is built so that **the AI never infers who you
are or where you're "from" from your DNA** — it only ever explains the
evidence that already exists.

---

### ⚙️ How We Built It

* **Backend (Flask + Gunicorn, DigitalOcean App Platform):**
  * A strict 23andMe parser that validates vendor signature, canonical
    columns, chromosomes, positions, genotypes, and build, and rejects or
    counts malformed rows without ever echoing raw data back.
  * An in-memory upload path (no disk-spooled temp files, no request
    caching) so a raw genome is never persisted by application code.
  * A **default-deny interpretation boundary** (`backend/boundaries.py`):
    only an explicitly reviewed, non-medical, well-replicated SNP allowlist
    (lactase persistence, earwax type, ACTN3, TAS2R38 bitter-tasting, and
    others) is ever interpreted; everything else — health risk, exact
    ethnicity, ancestry re-inference — gets a deterministic, honest refusal.
  * A **Gradient AI narrative layer** (`backend/gradient_client.py`): a
    deployed Gradient AI agent (OpenAI GPT-5) answers the six vetted
    question categories against the user's already-boundary-checked report,
    with automatic fallback to serverless Claude 4.6 Sonnet inference if the
    agent path is slow or unavailable.
  * Two new synthetic/real-data endpoints for the visualization layer:
    `backend/comparison.py` (procedurally generates a cited, labeled
    synthetic cohort from published population allele-frequency literature)
    and `backend/population_map.py` (returns real 1000 Genomes/HGDP reference
    populations at their real sampling coordinates, each scored against the
    user's own measured traits).
* **Frontend (React + Vite):** a restrained, accessible report view plus
  three interactive surfaces — the trait network, the 3D globe, and a
  research/chat workspace — all consuming the same-origin Flask API over
  relative URLs, with loading/empty/error states, keyboard operability, and
  reduced-motion/high-contrast support.
* **Data honesty layer:** every generated or aggregate data point is
  either (a) the user's own measured genotype, (b) a real, cited, named
  reference population, or (c) an explicitly labeled synthetic profile —
  never presented as a real other person's uploaded genome.

---

### 🔍 Key Features

* **Deterministic guided report** — same file in, same report out, every time.
* **Default-deny safety architecture** — only allowlisted, non-medical traits
  are interpreted; every other request gets a transparent refusal.
* **User-supplied, never DNA-inferred population context** — a broad label
  the user types in themselves, always tagged `inferred_from_dna: false`.
* **Reference-panel representation chart** — a real TOPMed r2 sample-count
  breakdown showing exactly which populations are under-represented.
* **Gradient AI research workspace** — six fixed, vetted question categories,
  answered with retrieval citations when available and a clean serverless
  fallback when not.
* **3D trait-comparison network** — your measured traits against a
  procedurally generated, clearly labeled synthetic cohort drawn from
  published allele-frequency literature (not real other users' data).
* **3D reference-population globe** — real, named, citable 1000
  Genomes/HGDP populations at their real sampling locations, each with an
  expected-similarity score computed from the same cited literature.
* **Dated research bridge** — links to real, currently active genomics
  programs recruiting under-represented populations, with consent/privacy
  context.

---

### 🧩 Architecture Overview

```
┌──────────────┐   same-origin HTTPS   ┌───────────────────────────┐
│   React /    │ ─────────────────────►│  Flask + Gunicorn          │
│   Vite app   │◄───────────────────── │  (DigitalOcean App Platform)│
└──────────────┘                       └───────────────┬─────────────┘
                                                         │
                        ┌────────────────────────────────┼─────────────────────────┐
                        ▼                                ▼                         ▼
              /api/analyze                      /api/narrative           /api/comparison-cohort
        (deterministic local report)      (Gradient AI agent, GPT-5)     /api/population-map
        strict parser + allowlist          + serverless Claude 4.6       (synthetic cited cohort +
        + default-deny boundaries          Sonnet fallback               real 1000G/HGDP populations)
```

---

### 💡 What We Learned

* **Safety architecture is easier to trust when it's structural, not just
  policy.** A default-deny allowlist means "we don't interpret that" is
  enforced in code, not just documented.
* **Deployed AI agents have real, undocumented constraints.** DigitalOcean's
  Gradient AI agent endpoint hard-rejects `system`/`developer` role
  messages once agent instructions are configured server-side — we only
  found this by live-tailing `doctl apps logs` in production.
* **"Compare yourself to 100+ people" is a data-honesty problem, not just an
  engineering one.** With no real consented cohort, the honest path was
  procedurally generating a clearly labeled synthetic cohort from real,
  cited published literature — rather than either refusing the feature or
  quietly faking real user data.
* **Latency needs a UI story, not just a timeout.** A live Gradient AI agent
  call can take 60–90 seconds; that has to be a visible, designed state, not
  a spinner and a prayer.

---

### 🧠 Challenges We Faced

* **Root-causing a silent Gradient AI agent failure in production:** the
  agent endpoint returned a generic 5xx until we live-tailed logs, fixed the
  `?agent=true` routing form, patched an `openai`/`httpx` client
  incompatibility, and discovered the system/developer-message rejection —
  four distinct bugs stacked on top of each other.
* **No real "100+ person" dataset existed** to power the requested
  cohort-comparison visualization — we solved this by grounding every
  synthetic profile in real, cited population allele-frequency papers
  instead of inventing numbers or fabricating other people's data.
* **Balancing an ambitious product ask against a hard-won safety boundary:**
  the map/comparison features ask to show "where you stand," which is in
  tension with our own no-DNA-geolocation rule. We resolved it by keeping
  every fact the API returns literally true — real populations at real
  coordinates, an aggregate similarity score, a "you" marker that only ever
  echoes what the user typed — and never letting the backend infer a
  location or ancestry from DNA.
* **Coordinating a fast-moving two-agent build** (frontend and backend
  developed concurrently) without one side's changes silently overwriting
  the other's, using a shared README as the single source of truth.

---

### 🚀 Impact

Millions of people get a consumer DNA report every year with no way to know
whether their result is precise because the science is solid, or vague
because the reference data simply didn't include people like them. Ancestry
Audit Layer makes that distinction visible, explains it in plain language,
and points people toward real research programs working to close the gap —
without ever making a new inference from their DNA itself.

---

### 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Flask, Gunicorn, Python |
| **Frontend** | React, Vite |
| **Deployment** | DigitalOcean App Platform (Docker, auto-deploy on push) |
| **AI Agent** | DigitalOcean Gradient AI Agent (OpenAI GPT-5) |
| **AI Fallback** | DigitalOcean Gradient AI Serverless Inference (Claude 4.6 Sonnet) |
| **3D Visualization** | 3d-force-graph, Three.js |
| **Reference Data** | TOPMed r2, 1000 Genomes Project, Human Genome Diversity Project |
| **Testing** | pytest, Vitest |

---

### 🧪 Future Enhancements

* Attach a DigitalOcean-managed Knowledge Base (corpus already curated and
  staged in `data/kb_sources/`) so Gradient AI answers carry real retrieval
  citations instead of an empty citations array.
* Pair the globe view with `globe.gl` for a dedicated basemap-aware
  rendering layer.
* Expand the non-medical trait allowlist as new well-replicated,
  population-inclusive studies are published.
* Verify and document deployed-agent guardrail configuration once
  DigitalOcean exposes it via API/CLI, not just the console.

---

### 🤝 Team

*(add teammates and roles here)*

---

### ❤️ Closing Thoughts

We are not an ancestry tool. We are an audit layer for ancestry tools — one
that tells people where certainty ends, why the gap exists, and what a
responsible next step looks like.

> "A precise-looking result can hide an unequal evidence base. Our job is to make that visible."
