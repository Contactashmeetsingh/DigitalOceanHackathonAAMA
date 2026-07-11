const TOPMED_R2_SOURCE = "https://www.nature.com/articles/s41586-021-03205-y";

export const TOPMED_PANEL = {
  name: "historical TOPMed r2 imputation reference panel (reported in 2021)",
  total: 97256,
  methodology:
    "The paper assigned 90,339 people (93%) to five broad super-populations using principal components and nearest 1000 Genomes samples; 6,917 remained unassigned. These are analytical assignments, not self-identity categories.",
  groups: [
    {
      id: "european",
      label: "European assignment",
      count: 47159,
      source: TOPMED_R2_SOURCE,
      sourceLabel: "Taliun et al., Nature (2021)",
    },
    {
      id: "african",
      label: "African assignment",
      count: 24267,
      source: TOPMED_R2_SOURCE,
      sourceLabel: "Taliun et al., Nature (2021)",
    },
    {
      id: "admixed-american",
      label: "Admixed American assignment",
      count: 17085,
      source: TOPMED_R2_SOURCE,
      sourceLabel: "Taliun et al., Nature (2021)",
    },
    {
      id: "east-asian",
      label: "East Asian assignment",
      count: 1184,
      source: TOPMED_R2_SOURCE,
      sourceLabel: "Taliun et al., Nature (2021)",
    },
    {
      id: "south-asian",
      label: "South Asian assignment",
      count: 644,
      source: TOPMED_R2_SOURCE,
      sourceLabel: "Taliun et al., Nature (2021)",
      caveat: "South Asian is a broad analytical super-population, not a homogeneous community.",
      nested: {
        label: "Pakistani subset reported in a later analysis",
        count: 139,
        source: "https://doi.org/10.1016/j.xhgg.2024.100395",
        sourceLabel: "Xu et al., Human Genetics and Genomics Advances (2025)",
        caveat: "This country-specific subset sits within broader South Asian coverage; it is not a peer super-population bar.",
      },
    },
    {
      id: "unassigned",
      label: "Unassigned",
      count: 6917,
      source: TOPMED_R2_SOURCE,
      sourceLabel: "Taliun et al., Nature (2021)",
      caveat: "The paper did not assign these samples to one of its five super-populations.",
    },
  ],
  context: {
    value: "96%",
    label: "of participants in the GWAS assessed in a 2009 analysis were of European descent.",
    caveat: "Historical participant share—not a share of studies, not a current estimate, and not a TOPMed sample count.",
    source: "https://doi.org/10.1016/j.tig.2009.09.012",
    sourceLabel: "Need & Goldstein, Trends in Genetics (2009)",
  },
};
