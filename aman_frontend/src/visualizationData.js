const ANCHOR_COLOR = "#4285F4";
const PEER_LINK_COLOR = "#BDC1C6";
const PROFILE_COUNT = 128;
const DEMO_PROFILE_ID = "synthetic-demo-profile";

const COHORT_GROUPS = Object.freeze({
  european: { label: "European reference model", color: "#4285F4" },
  african: { label: "African reference model", color: "#FBBC04" },
  hispanic_latino: { label: "Admixed American reference model", color: "#EA4335" },
  east_asian: { label: "East Asian reference model", color: "#34A853" },
  south_asian: { label: "South Asian reference model", color: "#1967D2" },
  southeast_asian: { label: "Southeast Asian reference model", color: "#188038" },
  middle_eastern_north_african: { label: "Middle Eastern / North African model", color: "#D93025" },
  indigenous_american: { label: "Indigenous American reference model", color: "#F9AB00" },
  pacific_islander: { label: "Pacific Islander reference model", color: "#669DF6" },
  unspecified: { label: "Unspecified reference model", color: "#9AA0A6" },
});

const TRAIT_DEFINITIONS = [
  {
    id: "lactase",
    label: "Lactase persistence",
    color: "#4285F4",
    reportIds: ["rs4988235"],
    keywords: ["lactase"],
  },
  {
    id: "earwax",
    label: "Earwax type",
    color: "#EA4335",
    reportIds: ["rs17822931"],
    keywords: ["earwax"],
  },
  {
    id: "bitter-taste",
    label: "Bitter-taste perception",
    color: "#FBBC04",
    reportIds: ["rs713598", "rs1726866", "rs10246939"],
    keywords: ["tas2r38", "bitter-taste", "bitter taste"],
  },
  {
    id: "photic-sneeze",
    label: "Photic sneeze reflex",
    color: "#34A853",
    reportIds: ["rs10427255"],
    keywords: ["photic sneeze"],
  },
  {
    id: "actn3",
    label: "ACTN3 protein production",
    color: "#1967D2",
    reportIds: ["rs1815739"],
    keywords: ["actn3", "alpha-actinin-3"],
  },
  {
    id: "cilantro",
    label: "Cilantro taste perception",
    color: "#D93025",
    reportIds: ["rs72921001"],
    keywords: ["cilantro"],
  },
];

export const TRAIT_CATEGORIES = Object.freeze(
  TRAIT_DEFINITIONS.map(({ id, label, color }) => Object.freeze({ id, label, color })),
);

export const VISUALIZATION_SAFETY = Object.freeze({
  synthetic: true,
  syntheticUiPreview: true,
  previewOnly: true,
  containsRealComparisonProfiles: false,
  identityOrLocationDerivedFromDna: false,
  copy:
    "Synthetic UI preview only. Anonymous comparison identities and locations are generated placeholders, never derived or inferred from DNA.",
});

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function extractTraitItems(reportData) {
  if (Array.isArray(reportData)) return reportData;
  if (!isRecord(reportData)) return [];

  if (Array.isArray(reportData.traits)) return reportData.traits;
  if (isRecord(reportData.traits) && Array.isArray(reportData.traits.items)) {
    return reportData.traits.items;
  }
  if (isRecord(reportData.traits) && Array.isArray(reportData.traits.results)) {
    return reportData.traits.results;
  }
  if (Array.isArray(reportData.items)) return reportData.items;
  if (Array.isArray(reportData.trait_hits)) return reportData.trait_hits;
  return [];
}

function normalizedItemIds(item) {
  const ids = [];
  if (typeof item.rsid === "string") ids.push(item.rsid);
  if (Array.isArray(item.rsids)) ids.push(...item.rsids);

  return new Set(
    ids
      .filter((id) => typeof id === "string")
      .flatMap((id) => id.toLowerCase().split(/[\s/,]+/))
      .filter(Boolean),
  );
}

function findTraitItem(items, definition) {
  return items.find((candidate) => {
    if (!isRecord(candidate)) return false;
    const ids = normalizedItemIds(candidate);
    if (definition.reportIds.some((id) => ids.has(id))) return true;

    const name = [candidate.name, candidate.title]
      .filter((value) => typeof value === "string")
      .join(" ")
      .toLowerCase();
    return definition.keywords.some((keyword) => name.includes(keyword));
  });
}

function deriveStatus(item) {
  if (!isRecord(item)) return "Awaiting report";

  const backendStatus =
    typeof item.interpretation_status === "string"
      ? item.interpretation_status.toLowerCase()
      : typeof item.status === "string"
        ? item.status.toLowerCase()
        : "";

  if (item.interpretable === true || backendStatus === "interpreted") {
    return "Interpreted";
  }
  if (
    (item.partially_measured === true && item.measured !== true) ||
    backendStatus === "not_fully_measured" ||
    backendStatus === "partially_measured"
  ) {
    return "Partially measured";
  }
  if (
    item.measured === false ||
    backendStatus === "not_measured" ||
    backendStatus === "unavailable"
  ) {
    return "Not measured";
  }
  if (item.measured === true && backendStatus === "unverified_reference_build") {
    return "Measured - reference build unverified";
  }
  if (item.measured === true) return "Measured - interpretation limited";
  return "Awaiting report";
}

/**
 * Convert the backend's trait envelope into the six safe graph hubs.
 *
 * Only allowlisted IDs, measurement booleans, and known status values are read.
 * Genotypes, marker calls, and free-form interpretation text are intentionally
 * never copied to the returned data.
 */
export function deriveTraitHubData(reportData) {
  const items = extractTraitItems(reportData);

  return TRAIT_DEFINITIONS.map((definition) => {
    const status = deriveStatus(findTraitItem(items, definition));
    return {
      id: `trait-${definition.id}`,
      type: "trait",
      label: definition.label,
      category: definition.id,
      color: definition.color,
      status,
      summary: `${definition.label}: ${status.toLowerCase()}.`,
      val: 7,
    };
  });
}

function comparisonProfile(index, definition) {
  const number = index + 1;
  const id = `comparison-${String(number).padStart(3, "0")}`;
  const match = 62 + ((index * 17 + (index % TRAIT_DEFINITIONS.length) * 7) % 36);

  return {
    id,
    type: "profile",
    label: `Anonymous preview ${String(number).padStart(3, "0")}`,
    category: definition.id,
    categoryLabel: definition.label,
    color: definition.color,
    match,
    summary: `Synthetic ${match}% demo similarity around ${definition.label}; no real person is represented.`,
    val: 1.35,
  };
}

/**
 * Build fresh graph objects because 3d-force-graph mutates its node/link input.
 */
export function buildTraitNetwork(reportData) {
  const traitNodes = deriveTraitHubData(reportData);
  const nodes = [
    {
      id: "you",
      type: "anchor",
      label: "You (report anchor)",
      category: "anchor",
      color: ANCHOR_COLOR,
      summary: "Your report anchor. Raw genotypes are never placed in this visualization.",
      val: 14,
    },
    ...traitNodes,
  ];
  const links = traitNodes.map((trait) => ({
    id: `you-to-${trait.id}`,
    source: "you",
    target: trait.id,
    type: "report-trait",
    category: trait.category,
    color: trait.color,
    width: 1.4,
  }));
  const previousProfileByCategory = new Map();

  for (let index = 0; index < PROFILE_COUNT; index += 1) {
    const definition = TRAIT_DEFINITIONS[index % TRAIT_DEFINITIONS.length];
    const profile = comparisonProfile(index, definition);
    const previousProfile = previousProfileByCategory.get(definition.id);

    nodes.push(profile);
    links.push({
      id: `${profile.id}-to-trait-${definition.id}`,
      source: profile.id,
      target: `trait-${definition.id}`,
      type: "synthetic-trait-similarity",
      category: definition.id,
      color: definition.color,
      width: 0.55,
    });
    if (previousProfile) {
      links.push({
        id: `${previousProfile}-to-${profile.id}`,
        source: previousProfile,
        target: profile.id,
        type: "synthetic-peer",
        category: definition.id,
        color: PEER_LINK_COLOR,
        width: 0.2,
      });
    }
    previousProfileByCategory.set(definition.id, profile.id);
  }

  return {
    nodes,
    links,
    meta: {
      ...VISUALIZATION_SAFETY,
      profileCount: PROFILE_COUNT,
      traitHubCount: TRAIT_DEFINITIONS.length,
      anchorCount: 1,
      source: "deterministic-local-preview",
      categories: TRAIT_CATEGORIES,
    },
  };
}

function endpointId(endpoint) {
  return isRecord(endpoint) ? endpoint.id : endpoint;
}

function cohortGroup(group) {
  return typeof group === "string" && Object.hasOwn(COHORT_GROUPS, group)
    ? group
    : "unspecified";
}

/**
 * Convert the report-grounded cohort API response into renderer-safe clusters.
 *
 * The backend includes synthetic genotype calls so it can calculate aggregate
 * similarity. This adapter deliberately drops those calls before any graph
 * node reaches the renderer or its accessible data table.
 */
export function buildComparisonNetwork(cohortData, reportData) {
  if (!isRecord(cohortData) || !Array.isArray(cohortData.nodes) || !Array.isArray(cohortData.links)) {
    return buildTraitNetwork(reportData);
  }

  const apiProfiles = cohortData.nodes.filter(
    (node) => isRecord(node) && node.is_synthetic === true && typeof node.id === "string",
  );
  if (apiProfiles.length === 0) return buildTraitNetwork(reportData);

  const linkValueByTarget = new Map();
  for (const link of cohortData.links) {
    if (!isRecord(link)) continue;
    const target = endpointId(link.target);
    const source = endpointId(link.source);
    const profileId = target === "you" ? source : target;
    if (typeof profileId === "string" && Number.isFinite(Number(link.value))) {
      linkValueByTarget.set(profileId, Math.max(0, Math.min(1, Number(link.value))));
    }
  }

  const categoryIds = [...new Set(apiProfiles.map((node) => cohortGroup(node.group)))];
  const categories = categoryIds.map((id) => ({ id, ...COHORT_GROUPS[id] }));
  const nodes = [
    {
      id: "you",
      type: "anchor",
      label: "You (report anchor)",
      category: "anchor",
      color: ANCHOR_COLOR,
      summary: "Your boundary-checked report anchor. Genotype calls are excluded from the rendered graph.",
      val: 14,
    },
    ...categories.map((category) => ({
      id: `group-${category.id}`,
      type: "group",
      label: category.label,
      category: category.id,
      color: category.color,
      summary: "A broad modeling bucket used to generate illustrative profiles; it is not an identity assignment.",
      val: 6,
    })),
  ];
  const links = categories.map((category) => ({
    id: `you-to-group-${category.id}`,
    source: "you",
    target: `group-${category.id}`,
    kind: "anchor",
    category: category.id,
    color: category.color,
  }));

  for (const [index, rawNode] of apiProfiles.entries()) {
    const category = cohortGroup(rawNode.group);
    const style = COHORT_GROUPS[category];
    const match = Math.round((linkValueByTarget.get(rawNode.id) || 0) * 100);
    const label = typeof rawNode.label === "string"
      ? rawNode.label
      : `Illustrative profile ${String(index + 1).padStart(3, "0")}`;
    nodes.push({
      id: rawNode.id,
      type: "profile",
      label,
      category,
      categoryLabel: style.label,
      color: style.color,
      match,
      summary: `Synthetic ${match}% modeled trait similarity; no real comparison person is represented.`,
      val: 1.35,
    });
    links.push({
      id: `${rawNode.id}-to-group-${category}`,
      source: rawNode.id,
      target: `group-${category}`,
      kind: "synthetic-model",
      category,
      color: style.color,
    });
  }

  return {
    nodes,
    links,
    meta: {
      ...VISUALIZATION_SAFETY,
      profileCount: apiProfiles.length,
      groupHubCount: categories.length,
      anchorCount: 1,
      source: "report-grounded-synthetic-cohort-api",
      categories,
      disclaimer: typeof cohortData.disclaimer === "string" ? cohortData.disclaimer : "",
      citations: Array.isArray(cohortData.citations) ? cohortData.citations : [],
      generationMethod: cohortData.generation_method,
    },
  };
}

/**
 * Normalize the population-map API response for the Three.js scene.
 * Coordinates and labels identify cited public reference panels; the optional
 * marker is present only when the backend echoes a recognized user-supplied
 * broad label.
 */
export function buildPopulationGlobe(populationMapData) {
  if (!isRecord(populationMapData) || !Array.isArray(populationMapData.populations)) {
    return null;
  }

  const regions = populationMapData.populations
    .filter((population) => isRecord(population)
      && typeof population.id === "string"
      && typeof population.label === "string"
      && Number.isFinite(Number(population.lat))
      && Number.isFinite(Number(population.lon)))
    .map((population) => {
      const category = cohortGroup(population.group);
      const hasScore = population.expected_similarity !== null
        && population.expected_similarity !== undefined;
      const rawScore = hasScore ? Number(population.expected_similarity) : Number.NaN;
      const modelScore = Number.isFinite(rawScore)
        ? Math.round(Math.max(0, Math.min(1, rawScore)) * 100)
        : null;
      return {
        id: population.id,
        label: population.label,
        country: typeof population.country === "string" ? population.country : "Reference panel",
        lat: Number(population.lat),
        lng: Number(population.lon),
        color: COHORT_GROUPS[category].color,
        category,
        modelScore,
        source: typeof population.source === "string" ? population.source : "",
        context: `${population.id} · ${typeof population.country === "string" ? population.country : "cited reference panel"}`,
        detail: modelScore === null
          ? "No modeled trait similarity is available for the measured report fields."
          : `${modelScore}% expected aggregate similarity across the report's measured, non-medical trait model. This is not an ancestry percentage.`,
      };
    });
  if (regions.length === 0) return null;

  const rawMarker = isRecord(populationMapData.you_marker) ? populationMapData.you_marker : null;
  const markerRegion = rawMarker
    ? regions.find((region) => region.id === rawMarker.population_id)
    : null;
  const marker = markerRegion
    ? {
        ...markerRegion,
        label: typeof rawMarker.label === "string" ? rawMarker.label : markerRegion.label,
        source: "user-supplied-label",
        context: "An approximate display anchor copied from a broad label the user supplied; never inferred from DNA.",
      }
    : null;

  return {
    profileId: "report-grounded-reference-map",
    residence: marker,
    regions,
    meta: {
      source: "report-grounded-population-map-api",
      containsRealReferencePopulations: true,
      identityOrLocationDerivedFromDna: false,
      disclaimer: typeof populationMapData.disclaimer === "string" ? populationMapData.disclaimer : "",
      citations: Array.isArray(populationMapData.citations) ? populationMapData.citations : [],
    },
  };
}

export const DEMO_GLOBE = Object.freeze({
  profileId: DEMO_PROFILE_ID,
  residence: Object.freeze({
    id: "demo-residence",
    label: "Demo residence: San Francisco, United States",
    lat: 37.7749,
    lng: -122.4194,
    source: "synthetic-demo-residence",
    context: "A residence entered for the demo profile, never inferred from DNA.",
  }),
  regions: Object.freeze(
    [
      {
        id: "united-kingdom",
        label: "United Kingdom",
        lat: 54.5,
        lng: -3.5,
        percentage: 22,
        color: "#4285F4",
        context: "An illustrative family-context region supplied by the demo profile.",
      },
      {
        id: "germany-central-europe",
        label: "Germany / Central Europe",
        lat: 50.5,
        lng: 10.5,
        percentage: 18,
        color: "#EA4335",
        context: "A broad demo region that is intentionally separate from residence.",
      },
      {
        id: "south-asia",
        label: "South Asia",
        lat: 22.5,
        lng: 78.5,
        percentage: 20,
        color: "#FBBC04",
        context: "A broad user-declared context label, not a precise community claim.",
      },
      {
        id: "west-africa",
        label: "West Africa",
        lat: 9.0,
        lng: -4.0,
        percentage: 14,
        color: "#34A853",
        context: "A broad illustrative context whose many populations are not interchangeable.",
      },
      {
        id: "east-asia",
        label: "East Asia",
        lat: 35.0,
        lng: 105.0,
        percentage: 13,
        color: "#1967D2",
        context: "An illustrative broad region supplied by the synthetic demo profile.",
      },
      {
        id: "americas",
        label: "Americas",
        lat: 15.0,
        lng: -75.0,
        percentage: 13,
        color: "#D93025",
        context: "A deliberately broad demo region, not an Indigenous identity assignment.",
      },
    ].map((region) =>
      Object.freeze({
        ...region,
        profileId: DEMO_PROFILE_ID,
        source: "synthetic-user-provided-ancestry-context",
      }),
    ),
  ),
  meta: Object.freeze({
    ...VISUALIZATION_SAFETY,
    profileId: DEMO_PROFILE_ID,
    percentageScope: "synthetic-demo-profile-only",
    residenceSource: "synthetic demo residence field",
    regionSource: "synthetic examples of user-provided ancestry context",
  }),
});
