# 1000 Genomes Phase 3 runtime reference

`phase3_reference.json.gz` is the compact, reproducible reference artifact used
by the genetic-closeness audit. The raw 1000 Genomes files are intentionally not
committed or copied into the deployment image.

## Upstream files

The source is the build-37, 2,504-sample Phase 3 primary release linked from the
[PLINK 2 resources page](https://www.cog-genomics.org/plink/2.0/resources#1kg_phase3):

- `all_phase3.pgen.zst`
- `all_phase3.pvar.zst`
- `phase3_corrected.psam`

Population descriptions come from the International Genome Sample Resource:

- [20131219.populations.tsv](https://ftp.1000genomes.ebi.ac.uk/vol1/ftp/phase3/20131219.populations.tsv)
- [20131219.superpopulations.tsv](https://ftp.1000genomes.ebi.ac.uk/vol1/ftp/phase3/20131219.superpopulations.tsv)

Exact SHA-256 checksums of the inputs used for the committed artifact are in
`phase3_reference.metadata.json`. The PSAM contains 2,504 samples across 26
population labels and five superpopulation labels.

## Selection and build

The runtime panel uses autosomal, biallelic A/C/G/T SNPs. Palindromic SNPs,
duplicate rsIDs, variants below 5% global MAF, and variants above 2% missingness
are excluded. PLINK 2 then applies LD pruning at 200 kb / r² 0.2 and a seeded
20,000-variant thinning step. Nineteen thousand nine hundred seventy-nine
selected variants have rsIDs and enter the runtime artifact.

Representative commands, with the downloaded files under `$RAW`:

```bash
plink2 --pfile "$RAW/all_phase3" vzs \
  --autosome --snps-only just-acgt --max-alleles 2 \
  --maf 0.05 --geno 0.02 --exclude-palindromic-snps \
  --rm-dup exclude-all --set-missing-var-ids '@:#:$r:$a' \
  --indep-pairwise 200kb 0.2 --out "$RAW/common-pruned"

plink2 --pfile "$RAW/all_phase3" vzs \
  --autosome --snps-only just-acgt --max-alleles 2 \
  --exclude-palindromic-snps --rm-dup exclude-all \
  --set-missing-var-ids '@:#:$r:$a' \
  --extract "$RAW/common-pruned.prune.in" \
  --thin-count 20000 --seed 20260711 --write-snplist \
  --out "$RAW/runtime-panel"

plink2 --pfile "$RAW/all_phase3" vzs \
  --autosome --snps-only just-acgt --max-alleles 2 \
  --exclude-palindromic-snps --rm-dup exclude-all \
  --set-missing-var-ids '@:#:$r:$a' \
  --extract "$RAW/runtime-panel.snplist" \
  --loop-cats Population \
  --freq cols=chrom,pos,ref,alt1,alt1freq,nobs \
  --out "$RAW/panel-frequency"

python scripts/build_reference_panel.py \
  --psam "$RAW/phase3_corrected.psam" \
  --populations "$RAW/20131219.populations.tsv" \
  --superpopulations "$RAW/20131219.superpopulations.tsv" \
  --frequency-prefix "$RAW/panel-frequency" \
  --pgen-zst "$RAW/all_phase3.pgen.zst" \
  --pvar-zst "$RAW/all_phase3.pvar.zst" \
  --output data/reference/phase3_reference.json.gz \
  --metadata-output data/reference/phase3_reference.metadata.json
```

The gzip output is deterministic (`mtime=0`). NumPy is required only by the
offline builder for classical multidimensional scaling; it is not a production
dependency.

## Interpretation boundary

The active method is an allele-frequency RMS distance over SNPs that overlap the
uploaded chip. It is not an ancestry percentage, ethnicity assignment, identity
claim, or clinical result. The three-dimensional angle comes from MDS of the 26
population-frequency profiles; the user-specific radial edge length represents
the measured frequency distance.

Map coordinates are approximate display anchors derived from the location words
in the official population descriptions. They are not participant residences,
birthplaces, or inferred origins. Each marker therefore retains the official
description, sample count, display-anchor precision, and source links.
