# Three-minute demo script

Target length: 2:40–2:55, leaving a few seconds for page or network latency.
Replace bracketed deployment details only after the live DigitalOcean path has
been verified.

## 0:00–0:25 — The problem

“Consumer DNA results can look scientific while hiding an important limitation:
the reference panels used for comparison do not represent every population
equally. When evidence underrepresents a population, transfer can be less certain
and a responsible explanation may need to be less specific. Ancestry Audit Layer
is not another ancestry predictor. It is an audit layer that explains what an
existing result can support, what it cannot support, and why.”

## 0:25–0:45 — Safety and privacy

“The user supplies their exported 23andMe raw-data file and, optionally, copies a
broad population label from the result they already received. We never infer
ancestry from the DNA. We interpret only a small allowlist of non-medical traits,
refuse health-risk and exact-ethnicity requests by default, and do not retain the
uploaded file.”

## 0:45–1:45 — Live guided report

1. Open **[LIVE APP URL]**.
2. Select the prepared open-consent Harvard Personal Genome Project demo file.
3. Enter the prepared broad label, such as “Broadly South Asian.” State clearly
   that this label is user-supplied, not inferred.
4. Select **Analyze file**.
5. Point out the validated file format, reference build, marker coverage, and
   no-call count.
6. Show one measured allowlisted trait. Read its plain-language interpretation,
   then its evidence caveat and primary citation.
7. Show an unmeasured trait and explain that chip coverage differs; “not measured”
   is not a biological conclusion.
8. Show the hard-boundary card: no diagnoses, health-risk interpretation,
   ancestry re-inference, or exact ethnicity.

## 1:45–2:15 — The representation gap

“This chart uses published counts from the same TOPMed reference-panel
denominator. The point is not to classify this user. It makes the comparison data
imbalance visible. A smaller or less representative comparison set limits how
specific a responsible explanation can be.”

Show the selected broad population context and the dated research-program bridge.
Emphasize that eligibility and recruiting status must be verified on the linked
official page before anyone shares information.

## 2:15–2:40 — DigitalOcean architecture

“The application runs on DigitalOcean App Platform at **[LIVE APP URL]**. The
explanation layer uses the DigitalOcean agent **[AGENT NAME]**, with the
Sensitive-Data guardrail and the indexed **[KNOWLEDGE BASE NAME]** Knowledge Base.
The application requests retrieval metadata so factual narrative claims can be
shown with their sources. **Only say this after the agent, guardrail, retrieval,
and live deployment checks pass.**”

## 2:40–2:55 — Close

“The social-good intervention is transparency: tell people where certainty ends,
show why the gap exists, and connect underrepresentation to a careful next step.
We are not an ancestry tool. We are an audit layer for ancestry tools.”

## Recording checklist

- Use a public PGP demo file, never a teammate’s private genome.
- Preload the file picker location and broad label.
- Hide browser bookmarks, notifications, tokens, console logs, and account IDs.
- Record one clean continuous demo before trying alternate takes.
- Do not claim live citations unless the rendered links came from retrieval.
- Keep the final video below the event’s stated time and file limits.
