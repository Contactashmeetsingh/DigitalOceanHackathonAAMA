# Knowledge Base sources

Curated corpus for the DigitalOcean `genetics-literacy-kb`. The list favors
open full text and direct evidence about reference-panel representation and
imputation accuracy. Broad population labels are navigation aids, not claims
that any population is homogeneous.

`population_genetics_evidence.md` is the crawler-safe retrieval dossier. It
records publication dates, purpose, bounded factual summaries, and direct links
to every paper below. It exists because NCBI and Europe PMC returned failed or
not-updated status to the managed crawler; it does not replace the papers.

## DigitalOcean database and genomic reference foundation

- **DigitalOcean Managed OpenSearch database** — the KB's `database_id`, not a
  crawled document. `scripts/create_kb.sh --check` refuses to add sources unless
  the existing KB is wired to this DO-managed vector store.
- **1000 Genomes Project global reference** —
  https://pmc.ncbi.nlm.nih.gov/articles/PMC4750478/ — baseline reference panel:
  2,504 individuals across 26 populations, useful for explaining what a panel is
  and what later population-specific panels add.

## Diversity gap and ethics anchor

- **Bridging genomics' greatest challenge: The diversity gap** —
  https://pmc.ncbi.nlm.nih.gov/articles/PMC11770215/ — primary overview for the
  historical 96%-European GWAS statistic, current representation gaps, and
  trust context including Tuskegee and Henrietta Lacks.
- **Most disease gene variants show minimal population differentiation despite
  incomplete coverage** *(bioRxiv preprint; file upload)* —
  https://www.biorxiv.org/content/10.64898/2026.01.02.697354.full.pdf — recent
  preprint on incomplete population coverage; keep its claims clearly labeled
  as preprint evidence.

## Reference-panel accuracy across populations

- **A diverse ancestrally matched reference panel increases imputation
  accuracy** — https://pmc.ncbi.nlm.nih.gov/articles/PMC10390539/ — Thai cohort
  comparison of 1000 Genomes, HRC, GenomeAsia100K, and TOPMed; source for the
  TOPMed East Asian composition and GenomeAsia accuracy comparison.
- **Imputation accuracy across global human populations** *(bioRxiv version;
  file upload)* —
  https://www.biorxiv.org/content/10.1101/2023.05.22.541241.full.pdf — tests
  imputation across 123 populations and documents persistent accuracy gaps.
- **GenomeAsia 100K pilot** —
  https://pmc.ncbi.nlm.nih.gov/articles/PMC7054211/ — South and East Asian
  reference effort covering 1,739 individuals, 219 population groups, and 64
  countries.
- **Sub-Saharan African imputation panel evaluation** —
  https://www.sciencedirect.com/science/article/pii/S2666979X23001003 — shows
  why a nominally African panel can still overrepresent West African variation
  and underperform for southern African groups.
- **African-American population-specific reference panel** —
  https://pmc.ncbi.nlm.nih.gov/articles/PMC8571350/ — open reference panel of
  2,269 people with mainly Atlantic African ancestry; adds concrete West African
  and diaspora coverage without treating Africa as monolithic.
- **East Asian 14,393-genome reference panel** —
  https://pmc.ncbi.nlm.nih.gov/articles/PMC10411914/ — large East Asian panel
  demonstrating improved discovery and imputation of low-frequency variants.
- **Native American genomes improve Latin American imputation** —
  https://pmc.ncbi.nlm.nih.gov/articles/PMC8762266/ — adds 134 Native American
  genomes to 1000 Genomes and measures gains, while explicitly documenting the
  panel's Mexico-heavy limitations.
- **Thousands of Qatari genomes inform human migration history and improve
  imputation of Arab haplotypes** *(Nature Communications, 2021)* —
  https://pmc.ncbi.nlm.nih.gov/articles/PMC8511259/ — analyzes 6,218 whole
  genomes and builds a 12,432-haplotype panel for Arab and wider Middle Eastern
  populations, adding a region absent from 1000 Genomes Phase 3 labels.
- **Genetics of Latin American Diversity Project** *(Cell Genomics, 2024)* —
  https://pmc.ncbi.nlm.nih.gov/articles/PMC11605695/ — documents GLADdb's
  53,738 participants across 39 studies and 46 regions, heterogeneous admixture,
  consent/access constraints, and a summary-statistic matching method that does
  not transfer individual-level genotypes.

## Operating notes

- Run `scripts/create_kb.sh --list` to review the exact source manifest.
- Run `scripts/create_kb.sh --check` before mutation; it verifies the named KB
  exists and exposes a DO Managed OpenSearch `database_id`.
- HTML sources use section-based web-crawler entries. The two dense bioRxiv PDFs
  use semantic chunking and are downloaded by `--download-pdfs`. The control
  plane currently grants their presigned uploads but rejects the documented
  file object on the add-data-source endpoint; `--upload-pdfs` therefore fails
  visibly instead of claiming ingestion. The open full-text corpus remains the
  production retrieval source until DigitalOcean accepts that object or the
  files are attached through the console.
- PubMed Central article identifiers are crawled through Europe PMC's lawful
  open-full-text mirrors because the DigitalOcean crawler returned failed status
  for every `pmc.ncbi.nlm.nih.gov` page in the first job while providing no
  error detail. Citation links above retain their familiar canonical pages.
- `--apply-web` adds only missing crawler URLs. `--index` starts indexing for the
  named KB, `--status` reports its latest job, and `--attach` selects the intended
  agent by the configured endpoint rather than guessing from account order.
- Adding or changing sources requires indexing. After web addition and PDF
  upload, monitor the indexing job and re-run indexing in the DigitalOcean
  console (or via the control-plane API) before expecting agent answers to use
  the new corpus. Editing application code cannot update the managed KB.
- Reference build for SNP annotation remains b37 / GRCh37.
