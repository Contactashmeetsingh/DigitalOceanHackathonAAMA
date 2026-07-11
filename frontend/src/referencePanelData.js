export const TOPMED_PANEL = {
  name: "TOPMed r2 imputation reference panel",
  total: 97256,
  groups: [
    {
      id: "european",
      label: "European",
      count: 47159,
      source: "https://www.nature.com/articles/s41586-023-06595-3",
      sourceLabel: "Mexico City Prospective Study, Nature (2023)",
    },
    {
      id: "african",
      label: "African",
      count: 24267,
      source: "https://www.nature.com/articles/s41586-023-06595-3",
      sourceLabel: "Mexico City Prospective Study, Nature (2023)",
    },
    {
      id: "admixed-american",
      label: "Admixed American",
      count: 17085,
      source: "https://www.nature.com/articles/s41586-023-06595-3",
      sourceLabel: "Mexico City Prospective Study, Nature (2023)",
    },
    {
      id: "east-asian",
      label: "East Asian",
      count: 1184,
      source: "https://www.nature.com/articles/s41598-023-39429-3",
      sourceLabel: "Mauleekoonphairoj et al., Scientific Reports (2023)",
    },
    {
      id: "pakistani",
      label: "Pakistani subset",
      count: 139,
      source: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10793543/",
      sourceLabel: "Nasir et al., AJHG Genomic Medicine (2023)",
      caveat: "This is a country-specific subset, not a count for all South Asian populations.",
    },
  ],
  context: {
    value: "96%",
    label: "of GWAS were conducted primarily on people of European ancestry in a widely cited 2009 assessment.",
    caveat: "Historical share of studies—not a TOPMed sample count and not plotted on the bar scale.",
    source: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11770215/",
    sourceLabel: "Corpas et al., Cell Genomics (2024)",
  },
};
