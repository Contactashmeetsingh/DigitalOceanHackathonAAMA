# Three-pillar audit instrument

## Implemented product decision

The visualization layer is now a source-backed **reference comparison
instrument**. It may compare an uploaded GRCh37 consumer genotype file with the
1000 Genomes Phase 3 population-frequency panel, but it must not turn that
comparison into ancestry percentages, an ethnicity verdict, identity, community
membership, or a geographic origin claim.

The instrument keeps three different kinds of information visibly separate:

1. **Genetic-closeness graph:** aggregate allele-frequency RMS distances from
   the uploaded sample to 26 reference sampling labels.
2. **Reference-panel Earth map:** approximate display anchors derived from the
   official population descriptions, plus TOPMed r2 broad analytical counts that
   expose panel imbalance.
3. **Deterministic report:** coverage, allowlisted non-medical traits,
   default-deny refusals, user-supplied broad context, studies, and optional
   cited Gradient AI answers.

The optional broad label is never used to compute, verify, or alter the genetic
distance. It remains text context copied from a result the user already has.

## Data and method

The runtime reference is generated from the user-specified build-37 PLINK 2
Phase 3 files:

- `all_phase3.pgen.zst`
- `all_phase3.pvar.zst`
- `phase3_corrected.psam`
- IGSR `20131219.populations.tsv`
- IGSR `20131219.superpopulations.tsv`

The reproducible selection retains 19,979 rsID SNPs after autosomal,
biallelic, A/C/G/T, MAF, missingness, non-palindromic, duplicate-ID, LD-pruning,
and seeded thinning filters. See `data/reference/README.md` for exact commands
and `phase3_reference.metadata.json` for input SHA-256 checksums.

For each compatible overlapping SNP, the backend compares the uploaded diploid
alternate-allele fraction (0, 0.5, or 1) with the reference population's
alternate-allele frequency. The displayed value is the root mean square of
those differences. Lower means a smaller measured distance on this SNP subset;
it is not a percentage or calibrated probability.

The 3D direction comes from classical multidimensional scaling of pairwise
population-frequency distances. The uploaded sample stays at the comparison
origin and the user-specific radial edge length represents the RMS distance.
This is the explicitly labelled frequency-distance fallback, not formal PCA
projection of the uploader.

## Validation and limits

The selected panel overlaps 2,841 markers on the public open-consent PGP v4
chip file used during development; 2,836 are callable and allele-compatible in
that fixture. Leave-one-out validation on the 2,504 reference samples produced:

- 99.24% agreement with the five source superpopulation labels using all 20,000
  selected markers;
- 99.28% superpopulation agreement on the 2,841-marker v4-chip overlap;
- 75.24% fine population-label agreement on that same chip overlap.

The fine-label result is deliberately displayed as a limitation. The product
shows the full distance ordering and exact reference N, but does not announce a
single population assignment. Different consumer chips may overlap different
SNPs, so distances are not comparable across uploads.

## Geography contract

The solid map markers are approximate anchors derived from phrases such as
“Tokyo, Japan,” “Lahore, Pakistan,” or broader country/region descriptions in
the official IGSR table. They are explicitly labelled by precision. They are
not participant residences, birthplaces, or inferred user origins.

The translucent TOPMed bubbles use the existing mutually exclusive r2
analytical counts and shared 97,256 denominator. Their regional positions are
schematic anchors for broad labels, not collection sites. This layer exists to
make representation imbalance legible; its values never enter the genetic
distance calculation.

## Interaction and accessibility

- Pointer drag, wheel zoom, arrow/zoom buttons, and Reset control the 3D view.
- Every population node is keyboard focusable and selectable with Enter/Space.
- One shared selection cross-highlights the 3D and Earth views and updates a
  persistent inspector with name, superpopulation, sample N, distance, and map
  anchor precision.
- Thin reference groups (`N < 80`) use amber, dashed geometry, a text warning,
  and an exact denominator rather than color alone.
- A complete 26-row table exposes the same values and selection behavior.
- Reduced-motion and forced-colors modes remain supported.
- No remote fonts, map tiles, analytics, or WebGL dependencies are loaded.

## Remaining review work

- User testing of the distance explanation and “not a percentage” language.
- Screen-reader review in VoiceOver/NVDA beyond automated semantic checks.
- Optional glossary definitions for RMS distance, reference panel, sampling
  label, analytical assignment, MDS, and chip overlap.
- Share-safe export of aggregate report text and citations only; never export
  the retained comparison markers or copied label without explicit consent.
