# Evidence-atlas UI roadmap

## Product decision

The next visualization is an **evidence atlas**, not a genetic map of a person.
This app must never use an uploaded genotype file to place someone on a world
map, infer a country/ethnicity/community, or present a broad research label as
identity. The only population context it may display is a broad label the user
copied from an existing result, and even that label is explanatory context—not a
new conclusion.

The map and 3D language should therefore mean:

- **2D coverage atlas:** where *published, aggregate research evidence* is
  available or thin, with the source, denominator, date, and methodology shown.
- **3D evidence landscape:** an optional aggregate comparison of evidence
  dimensions, never a PCA/UMAP plot of people or a cluster assignment of the
  uploader.

## Current UI direction

The interface has been upgraded to an evidence-console pattern:

1. A short scientific/editorial hero explains the product promise.
2. A three-item safeguard rail establishes in-memory handling, no re-inference,
   and default-deny limits before an upload is requested.
3. The upload is the single primary action. The empty state previews the report
   rather than showing a blank card.
4. The existing reference-panel bar chart has optional highlighting only; it
   never preselects a label as if it belonged to the user. It now also includes a
   data-table fallback.
5. The visual roadmap is visible in the product as an explicitly **planned**
   capability, so the demo does not imply that an atlas already exists.

## What the UI should add next

Prioritize these before adding visual spectacle:

| Priority | Capability | Why it matters |
|---|---|---|
| P0 | Provenance drawer for every number | Shows source URL, publication date, denominator, definition, and last review date. |
| P0 | Plain-language chart/table toggle | Makes every visual usable with a screen reader, keyboard, small screen, or low-bandwidth connection. |
| P0 | “What this does not mean” caption | Prevents users from reading population-reference data as a claim about themselves. |
| P1 | Report navigation/progress | Lets a user jump between coverage, traits, limits, context, and studies after analysis. |
| P1 | Share-safe export | Exports only the deterministic report summary and citations—never raw genotypes, marker calls beyond displayed allowlisted traits, or a copied population label without consent. |
| P1 | Evidence freshness labels | Shows when a study/status record was reviewed and offers a direct official source. |
| P2 | Guided compare mode | Lets someone compare two *published aggregate datasets*, with no user point or identity label. |
| P2 | Glossary | Defines reference panel, imputation, validation cohort, analytical assignment, and uncertainty in plain language. |

## 2D coverage-atlas specification

### The right question

> “How much published reference or validation evidence is available for this
> cited analytical grouping, and what are its limits?”

Not: “Where is this person from?” or “Which population does this genome belong
to?”

### Data model

Each visible region/group needs a checked aggregate record:

```json
{
  "id": "south-asian",
  "label": "South Asian analytical assignment",
  "metric": "reference_panel_count",
  "value": 644,
  "denominator": 97256,
  "source": {
    "label": "Taliun et al., Nature (2021)",
    "url": "https://www.nature.com/articles/s41586-021-03205-y",
    "published": "2021-02-10"
  },
  "methodology": "Principal-components and nearest-1000-Genomes analytical assignment.",
  "last_reviewed": "2026-07-11",
  "identity_caveat": "This is a broad research label, not a community or an identity.",
  "geometry_key": "south_asia_aggregate"
}
```

Do not manufacture geometry from a label. A world shape should be used only
when the source genuinely supports an aggregate geographic metric. If a record
is an analytical assignment rather than a geographic sample origin, use a
**non-geographic tile/region atlas** instead of pretending it maps to a country.

### Visual design

- Use a small set of muted blue tonal fills for one metric, plus a focused amber
  outline only for a user-selected **published comparison**.
- Show source, value, denominator, and caveat in a persistent side panel—not
  hover alone.
- Put an explicit annotation above the visual: “Aggregate evidence coverage;
  this does not locate or classify you.”
- Add a visible `Map / Table` switch. The table is equal in capability: sortable,
  keyboard usable, and source-linked.
- Keep the map static at first. Avoid pan/zoom until there are enough regions and
  a reason to inspect geography.
- Do not use heat-map gradients to imply precision beyond the underlying data.

### Interaction model

1. The default state is neutral: no population is selected.
2. A user may select a published comparison label from a labelled control.
3. The visual highlights the cited aggregate group and the side panel updates.
4. The report always repeats: “This does not classify uploaded DNA.”
5. A keyboard user can move through labelled regions or use the table. Focus and
   selection have text as well as color.

### Implementation choice

Start with a React-rendered SVG or tile grid and local JSON data. This has a
small bundle, is easy to test, and avoids third-party map-tile requests while
the product is processing sensitive genetic data. Consider MapLibre/Deck.gl only
after there is a source-backed geographic dataset, a privacy review of tile
requests, and a real need for pan/zoom.

## 3D evidence-landscape specification

### Use only for an aggregate question

3D can show trade-offs such as:

- x: cited reference-panel size;
- y: number or breadth of validation cohorts;
- z: evidence/citation recency or source coverage;
- color/shape: dataset family, with a text label for every item.

It must **not** show an uploader’s position, a genetic cluster, a country,
ethnicity, or a predicted community. It must not auto-rotate or make a
three-dimensional aesthetic imply biological distance.

### Interaction and accessibility

- Make the 3D view an optional advanced view after the accessible 2D/table
  version is complete.
- Default to a fixed camera and include a `Reset view` button.
- Offer named camera presets rather than requiring mouse precision.
- Respect reduced motion and provide a complete 2D scatter/table alternative.
- Keep fewer than 25 labelled aggregate points; otherwise use filtering or small
  multiples.
- Put the exact axis definitions, transformation, source, and caveat beside the
  visualization.

### Recommended sequence

1. Ship the data model, provenance drawer, table, and 2D tile atlas.
2. Validate the interpretation with users and accessibility review.
3. Add a 2D scatterplot for the three aggregate evidence dimensions.
4. Only then add an optional WebGL/Three.js layer if it reveals a relationship
   the 2D plot cannot. Keep the 2D fallback as the default for small screens and
   reduced-motion preferences.

## Copy-ready implementation prompt

Use this prompt with a coding agent when the data contract is ready:

```text
You are a senior React data-visualization engineer working on the Ancestry Audit
Layer. Implement an aggregate Evidence Atlas in the existing Vite/React frontend.

Product goal
- Help users understand unequal representation in published reference/validation
  datasets. This is an evidence-transparency tool, not an ancestry inference tool.

Non-negotiable safety rules
- Never derive a person’s location, ancestry, ethnicity, community, country, or
  cluster from uploaded DNA.
- Never plot a user point, marker, trajectory, or inferred population on the map
  or 3D view.
- Display only source-backed aggregate records. Every record must expose its
  source URL, publication date, denominator, metric definition, methodology,
  last-reviewed date, and identity caveat.
- Use research-source labels exactly as documented. Do not replace analytical
  assignments with identity claims such as “Indian,” “Chinese,” or “American.”
- Preserve the current default-deny, non-medical, privacy, and no-storage copy.

Technical constraints
- Keep the existing React/Vite stack and current CSS-variable theme. Do not add
  Tailwind, a component library, analytics, remote fonts, or third-party map
  tiles.
- Start from a local, version-controlled JSON dataset and validate it with Node
  tests. Do not invent values or geometry.
- Build `EvidenceAtlas`, `EvidenceDetails`, and `EvidenceTable` components.
- Use an accessible SVG tile/region atlas for the first version. The default state
  has no selected group. A labelled select control may highlight one published
  comparison group, but must say that it does not classify the uploaded DNA.
- Provide an equally capable table view with sortable columns: label, metric,
  value, denominator, source date, and last reviewed.
- Include a persistent visible annotation: “Aggregate evidence coverage; this
  does not locate or classify you.”
- All interactive controls must be keyboard usable, have visible focus, meet a
  44px target size, and work with prefers-reduced-motion and forced colors.
- Charts must not rely on color alone. Include direct labels and text summaries.
- Keep the bundle lightweight. Do not add WebGL in this phase.

Data contract
- Define a typed/validated record with id, label, metric, value, denominator,
  source { label, url, published }, methodology, last_reviewed, identity_caveat,
  and optional geometry_key.
- If a dataset has analytical assignments rather than true geographic origins,
  render a non-geographic tile atlas. Never draw country boundaries as a proxy.

Acceptance criteria
1. Existing upload, deterministic report, trait, boundary, study, and reference
   panel flows continue to work unchanged.
2. Atlas has a source-backed, neutral default state and no user location/point.
3. Table and SVG views show the same values and have automated integrity tests.
4. Every selected item shows all provenance fields and a readable caveat.
5. Mobile layout has no horizontal page scroll; the table can scroll within its
   own labelled container if necessary.
6. `npm test` and `npm run build` pass.

Do not begin a 3D view until this 2D version is complete and reviewed. In a
second phase, propose a 2D scatterplot plus an optional WebGL enhancement that
plots only aggregate evidence records, with fixed-camera defaults and a complete
2D/table fallback.
```
