const ANCHOR_COLOR = "#F8FAFC";
const PEER_LINK_COLOR = "#334155";
const PROFILE_COUNT = 128;
const DEMO_PROFILE_ID = "synthetic-demo-profile";

const TRAIT_DEFINITIONS = [
  {
    id: "lactase",
    label: "Lactase persistence",
    color: "#38BDF8",
    reportIds: ["rs4988235"],
    keywords: ["lactase"],
  },
  {
    id: "earwax",
    label: "Earwax type",
    color: "#A78BFA",
    reportIds: ["rs17822931"],
    keywords: ["earwax"],
  },
  {
    id: "bitter-taste",
    label: "Bitter-taste perception",
    color: "#F472B6",
    reportIds: ["rs713598", "rs1726866", "rs10246939"],
    keywords: ["tas2r38", "bitter-taste", "bitter taste"],
  },
  {
    id: "photic-sneeze",
    label: "Photic sneeze reflex",
    color: "#FBBF24",
    reportIds: ["rs10427255"],
    keywords: ["photic sneeze"],
  },
  {
    id: "actn3",
    label: "ACTN3 protein production",
    color: "#34D399",
    reportIds: ["rs1815739"],
    keywords: ["actn3", "alpha-actinin-3"],
  },
  {
    id: "cilantro",
    label: "Cilantro taste perception",
    color: "#FB7185",
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
        color: "#A78BFA",
        context: "An illustrative family-context region supplied by the demo profile.",
      },
      {
        id: "germany-central-europe",
        label: "Germany / Central Europe",
        lat: 50.5,
        lng: 10.5,
        percentage: 18,
        color: "#38BDF8",
        context: "A broad demo region that is intentionally separate from residence.",
      },
      {
        id: "south-asia",
        label: "South Asia",
        lat: 22.5,
        lng: 78.5,
        percentage: 20,
        color: "#F472B6",
        context: "A broad user-declared context label, not a precise community claim.",
      },
      {
        id: "west-africa",
        label: "West Africa",
        lat: 9.0,
        lng: -4.0,
        percentage: 14,
        color: "#FBBF24",
        context: "A broad illustrative context whose many populations are not interchangeable.",
      },
      {
        id: "east-asia",
        label: "East Asia",
        lat: 35.0,
        lng: 105.0,
        percentage: 13,
        color: "#34D399",
        context: "An illustrative broad region supplied by the synthetic demo profile.",
      },
      {
        id: "americas",
        label: "Americas",
        lat: 15.0,
        lng: -75.0,
        percentage: 13,
        color: "#FB7185",
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
