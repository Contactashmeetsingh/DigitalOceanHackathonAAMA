import assert from "node:assert/strict";
import test from "node:test";

import { buildReferenceEarth } from "./referenceEarthData.js";

const AVAILABLE = {
  status: "available",
  reference: {
    name: "1000 Genomes Phase 3",
    sample_count: 2504,
    population_count: 26,
    sources: { genotypes: "https://example.org/genotypes" },
  },
  overlap: { usable_markers: 2836, panel_markers: 19979 },
  caveats: ["Distance is not ancestry."],
  populations: [
    {
      code: "GBR",
      name: "British in England and Scotland",
      superpopulation: "EUR",
      superpopulation_name: "European",
      sample_count: 91,
      thin_reference: false,
      location: { label: "United Kingdom", lat: 54, lon: -2, precision: "country" },
      distance: 0.123456,
      rank: 2,
    },
  ],
};

test("Docker reference adapter maps exact distance, rank, N, and coordinates", () => {
  const earth = buildReferenceEarth(AVAILABLE);

  assert.equal(earth.meta.source, "docker-shipped-1000-genomes-phase3");
  assert.equal(earth.meta.referenceSampleCount, 2504);
  assert.equal(earth.meta.usableMarkers, 2836);
  assert.equal(earth.regions[0].id, "GBR");
  assert.equal(earth.regions[0].distance, 0.123456);
  assert.equal(earth.regions[0].rank, 2);
  assert.equal(earth.regions[0].sampleCount, 91);
  assert.equal(earth.regions[0].lng, -2);
  assert.match(earth.regions[0].detail, /Rank 2 of 26/);
  assert.doesNotMatch(
    JSON.stringify(earth),
    /"genotype":|"variants":|"traits":|rs123/,
  );
});

test("Docker reference adapter keeps geography but withholds distance when unavailable", () => {
  const earth = buildReferenceEarth({
    ...AVAILABLE,
    status: "insufficient_overlap",
    message: "At least 200 markers are required.",
  });

  assert.equal(earth.meta.available, false);
  assert.equal(earth.regions[0].distance, null);
  assert.equal(earth.regions[0].rank, null);
  assert.match(earth.regions[0].detail, /Distance is withheld/);
});
