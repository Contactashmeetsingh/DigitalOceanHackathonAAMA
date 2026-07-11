const RANK_COLORS = Object.freeze({
  closest: "#4285f4",
  near: "#34a853",
  middle: "#fbbc04",
  far: "#ea4335",
  unavailable: "#9aa0a6",
});

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function rankColor(rank) {
  if (!Number.isFinite(rank)) return RANK_COLORS.unavailable;
  if (rank <= 5) return RANK_COLORS.closest;
  if (rank <= 10) return RANK_COLORS.near;
  if (rank <= 18) return RANK_COLORS.middle;
  return RANK_COLORS.far;
}

function sourceRows(reference) {
  const sources = isRecord(reference?.sources) ? reference.sources : {};
  return [
    ["1000 Genomes Phase 3 genotype resources", sources.genotypes],
    ["IGSR population descriptions", sources.population_descriptions],
    ["IGSR superpopulation descriptions", sources.superpopulation_descriptions],
  ]
    .filter(([, url]) => typeof url === "string" && url.length > 0)
    .map(([label, url]) => ({ label, url }));
}

export function buildReferenceEarth(geneticCloseness) {
  if (!isRecord(geneticCloseness) || !Array.isArray(geneticCloseness.populations)) return null;

  const status = typeof geneticCloseness.status === "string"
    ? geneticCloseness.status
    : "unavailable";
  const available = status === "available";
  const populations = geneticCloseness.populations
    .filter((population) => isRecord(population)
      && typeof population.code === "string"
      && typeof population.name === "string"
      && isRecord(population.location)
      && Number.isFinite(Number(population.location.lat))
      && Number.isFinite(Number(population.location.lon)))
    .map((population) => {
      const distance = available ? optionalNumber(population.distance) : null;
      const rank = available ? optionalNumber(population.rank) : null;
      const sampleCount = optionalNumber(population.sample_count);
      const thinWarning = population.thin_reference
        ? " This population has fewer than 80 reference samples, so interpret its rank especially cautiously."
        : "";
      const metric = distance === null
        ? "Distance is withheld because this upload did not meet the reference-panel requirements."
        : `Rank ${rank} of 26 by RMS allele-frequency distance (${distance.toFixed(6)}); lower is closer within this upload only.`;

      return {
        id: population.code,
        label: population.name,
        lat: Number(population.location.lat),
        lng: Number(population.location.lon),
        color: rankColor(rank),
        category: population.superpopulation,
        metricKind: "distance",
        distance,
        rank,
        sampleCount,
        thinReference: Boolean(population.thin_reference),
        source: "docker-1000-genomes-phase3",
        context: `${population.code} · ${population.superpopulation_name || population.superpopulation || "1000 Genomes"}`,
        detail: `${population.location.label} (${population.location.precision || "approximate"} map anchor). Reference N=${sampleCount ?? "n/a"}. ${metric}${thinWarning}`,
      };
    });

  if (populations.length === 0) return null;

  const reference = isRecord(geneticCloseness.reference) ? geneticCloseness.reference : {};
  const overlap = isRecord(geneticCloseness.overlap) ? geneticCloseness.overlap : {};
  const caveats = Array.isArray(geneticCloseness.caveats)
    ? geneticCloseness.caveats.filter((item) => typeof item === "string")
    : [];
  const usableMarkers = optionalNumber(overlap.usable_markers) ?? 0;

  return {
    profileId: `docker-1000-genomes-${status}-${usableMarkers}`,
    residence: null,
    regions: populations,
    meta: {
      source: "docker-shipped-1000-genomes-phase3",
      distanceDataset: true,
      status,
      available,
      containsRealReferencePopulations: true,
      identityOrLocationDerivedFromDna: false,
      disclaimer: caveats.join(" ") || "Reference distance is not an ancestry percentage, ethnicity verdict, location, or identity claim.",
      citations: sourceRows(reference),
      message: typeof geneticCloseness.message === "string" ? geneticCloseness.message : "",
      referenceName: typeof reference.name === "string" ? reference.name : "1000 Genomes Phase 3",
      referenceSampleCount: optionalNumber(reference.sample_count),
      referencePopulationCount: optionalNumber(reference.population_count) ?? populations.length,
      usableMarkers,
      panelMarkers: optionalNumber(overlap.panel_markers),
    },
  };
}
