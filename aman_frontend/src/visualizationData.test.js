import assert from "node:assert/strict";
import test from "node:test";

import {
  DEMO_GLOBE,
  TRAIT_CATEGORIES,
  VISUALIZATION_SAFETY,
  buildComparisonNetwork,
  buildPopulationGlobe,
  buildTraitNetwork,
  deriveTraitHubData,
} from "./visualizationData.js";

const REPORT_FIXTURE = {
  traits: {
    items: [
      {
        rsid: "rs4988235",
        name: "Lactase persistence",
        measured: true,
        interpretable: true,
        interpretation_status: "interpreted",
        genotype: "PRIVATE-GENOTYPE-DO-NOT-RENDER",
      },
      {
        rsid: "rs17822931",
        measured: true,
        interpretable: false,
        interpretation_status: "unverified_reference_build",
      },
      {
        rsid: "rs713598/rs1726866/rs10246939",
        measured: false,
        partially_measured: true,
        interpretation_status: "not_fully_measured",
        marker_calls: { rs713598: "PRIVATE-MARKER-CALL" },
      },
      { rsid: "rs10427255", measured: false, interpretation_status: "not_measured" },
      {
        rsid: "rs1815739",
        measured: true,
        interpretable: false,
        interpretation_status: "unmapped_genotype",
      },
      { rsid: "rs72921001", measured: true, interpretable: true },
    ],
  },
};

test("trait network is deterministic and contains the exact preview populations", () => {
  const first = buildTraitNetwork(REPORT_FIXTURE);
  const second = buildTraitNetwork(REPORT_FIXTURE);
  const anchors = first.nodes.filter((node) => node.type === "anchor");
  const traits = first.nodes.filter((node) => node.type === "trait");
  const profiles = first.nodes.filter((node) => node.type === "profile");

  assert.deepEqual(first, second);
  assert.equal(first.nodes.length, 135);
  assert.equal(anchors.length, 1);
  assert.equal(traits.length, 6);
  assert.equal(profiles.length, 128);
  assert.equal(profiles[0].id, "comparison-001");
  assert.equal(profiles.at(-1).id, "comparison-128");
  assert.equal(new Set(first.nodes.map((node) => node.id)).size, first.nodes.length);
  assert.equal(new Set(first.links.map((link) => link.id)).size, first.links.length);
});

test("graph nodes have renderer-ready categories, colors, labels, and valid links", () => {
  const graph = buildTraitNetwork(REPORT_FIXTURE);
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const traitCategoryIds = new Set(TRAIT_CATEGORIES.map((category) => category.id));

  for (const node of graph.nodes) {
    assert.ok(node.id);
    assert.ok(node.label);
    assert.match(node.color, /^#[0-9a-f]{6}$/i);
    assert.ok(node.category === "anchor" || traitCategoryIds.has(node.category));
  }
  for (const profile of graph.nodes.filter((node) => node.type === "profile")) {
    assert.ok(Number.isInteger(profile.match));
    assert.ok(profile.match >= 0 && profile.match <= 100);
    assert.match(profile.summary, /synthetic/i);
  }
  for (const trait of graph.nodes.filter((node) => node.type === "trait")) {
    assert.ok(trait.status);
  }
  for (const link of graph.links) {
    assert.equal(typeof link.source, "string");
    assert.equal(typeof link.target, "string");
    assert.ok(nodeIds.has(link.source), `missing source node ${link.source}`);
    assert.ok(nodeIds.has(link.target), `missing target node ${link.target}`);
  }
});

test("trait hub helper derives safe labels and statuses without exposing genotype", () => {
  const hubs = deriveTraitHubData(REPORT_FIXTURE);

  assert.deepEqual(
    hubs.map(({ label, status }) => ({ label, status })),
    [
      { label: "Lactase persistence", status: "Interpreted" },
      { label: "Earwax type", status: "Measured - reference build unverified" },
      { label: "Bitter-taste perception", status: "Partially measured" },
      { label: "Photic sneeze reflex", status: "Not measured" },
      { label: "ACTN3 protein production", status: "Measured - interpretation limited" },
      { label: "Cilantro taste perception", status: "Interpreted" },
    ],
  );
  assert.doesNotMatch(JSON.stringify(hubs), /PRIVATE-GENOTYPE|PRIVATE-MARKER-CALL/);
  assert.doesNotMatch(JSON.stringify(buildTraitNetwork(REPORT_FIXTURE)), /PRIVATE-GENOTYPE|PRIVATE-MARKER-CALL/);

  const fullyMeasuredBitterTaste = deriveTraitHubData({
    traits: {
      items: [
        {
          rsid: "rs713598/rs1726866/rs10246939",
          measured: true,
          partially_measured: true,
          interpretable: false,
          interpretation_status: "unresolved_haplotype",
        },
      ],
    },
  });
  assert.equal(fullyMeasuredBitterTaste[2].status, "Measured - interpretation limited");
});

test("demo globe separates residence from synthetic user-provided context totaling 100 percent", () => {
  const requiredRegions = new Set([
    "united-kingdom",
    "germany-central-europe",
    "south-asia",
    "west-africa",
    "east-asia",
    "americas",
  ]);

  assert.equal(DEMO_GLOBE.regions.reduce((sum, region) => sum + region.percentage, 0), 100);
  assert.ok(!Object.hasOwn(DEMO_GLOBE.residence, "percentage"));
  assert.equal(DEMO_GLOBE.residence.source, "synthetic-demo-residence");
  assert.deepEqual(new Set(DEMO_GLOBE.regions.map((region) => region.id)), requiredRegions);
  for (const region of DEMO_GLOBE.regions) {
    assert.equal(region.profileId, DEMO_GLOBE.profileId);
    assert.equal(region.source, "synthetic-user-provided-ancestry-context");
    assert.ok(region.lat >= -90 && region.lat <= 90);
    assert.ok(region.lng >= -180 && region.lng <= 180);
    assert.match(region.color, /^#[0-9a-f]{6}$/i);
    assert.match(region.context, /demo|illustrative|broad/i);
  }
  assert.equal(DEMO_GLOBE.meta.percentageScope, "synthetic-demo-profile-only");
});

test("network and globe metadata explicitly state the synthetic DNA safety boundary", () => {
  const graphMeta = buildTraitNetwork().meta;

  for (const meta of [VISUALIZATION_SAFETY, graphMeta, DEMO_GLOBE.meta]) {
    assert.equal(meta.syntheticUiPreview, true);
    assert.equal(meta.identityOrLocationDerivedFromDna, false);
    assert.match(meta.copy, /synthetic UI preview/i);
    assert.match(meta.copy, /identit(?:y|ies) and locations/i);
    assert.match(meta.copy, /never derived or inferred from DNA/i);
  }
});

test("cohort API adapter clusters synthetic profiles while stripping every genotype", () => {
  const apiPayload = {
    nodes: [
      { id: "you", is_user: true, traits: { rs4988235: "PRIVATE-USER-CALL" } },
      { id: "cohort-1", label: "Illustrative profile 1", is_synthetic: true, group: "european", traits: { rs4988235: "PRIVATE-SYNTHETIC-CALL" } },
      { id: "cohort-2", label: "Illustrative profile 2", is_synthetic: true, group: "south_asian", traits: { rs4988235: "PRIVATE-SYNTHETIC-CALL" } },
    ],
    links: [
      { source: "you", target: "cohort-1", value: 0.75 },
      { source: "you", target: "cohort-2", value: 0.5 },
    ],
    disclaimer: "All comparison nodes are synthetic.",
    citations: [{ label: "Source", url: "https://example.org/source" }],
  };

  const graph = buildComparisonNetwork(apiPayload, REPORT_FIXTURE);
  assert.equal(graph.meta.source, "report-grounded-synthetic-cohort-api");
  assert.equal(graph.meta.profileCount, 2);
  assert.equal(graph.nodes.find((node) => node.id === "cohort-1").match, 75);
  assert.deepEqual(graph.meta.categories.map(({ id }) => id), ["european", "south_asian"]);
  assert.doesNotMatch(JSON.stringify(graph), /PRIVATE-USER-CALL|PRIVATE-SYNTHETIC-CALL/);
});

test("invalid cohort API data fails safely to the deterministic local preview", () => {
  const graph = buildComparisonNetwork({ nodes: [], links: [] }, REPORT_FIXTURE);
  assert.equal(graph.meta.source, "deterministic-local-preview");
  assert.equal(graph.meta.profileCount, 128);
});

test("population API adapter preserves cited coordinates but strips unrelated fields", () => {
  const globe = buildPopulationGlobe({
    populations: [
      {
        id: "GBR",
        label: "British in England and Scotland",
        country: "United Kingdom",
        lat: 54,
        lon: -2,
        group: "european",
        expected_similarity: 0.625,
        source: "https://example.org/panel",
        private_genotype: "DO-NOT-RENDER",
      },
    ],
    you_marker: { population_id: "GBR", label: "European", source: "user_supplied_label" },
    disclaimer: "Reference panels do not locate or classify the uploader.",
    citations: [{ label: "Panel", url: "https://example.org/panel" }],
  });

  assert.equal(globe.meta.source, "report-grounded-population-map-api");
  assert.equal(globe.regions[0].lng, -2);
  assert.equal(globe.regions[0].modelScore, 63);
  assert.equal(globe.residence.label, "European");
  assert.equal(globe.residence.source, "user-supplied-label");
  assert.doesNotMatch(JSON.stringify(globe), /DO-NOT-RENDER/);
});

test("population API adapter rejects an empty or malformed map", () => {
  assert.equal(buildPopulationGlobe(null), null);
  assert.equal(buildPopulationGlobe({ populations: [] }), null);
});

test("population API adapter keeps a missing modeled score distinct from zero", () => {
  const globe = buildPopulationGlobe({
    populations: [{
      id: "GBR",
      label: "British in England and Scotland",
      country: "United Kingdom",
      lat: 54,
      lon: -2,
      group: "european",
      expected_similarity: null,
    }],
  });
  assert.equal(globe.regions[0].modelScore, null);
});
