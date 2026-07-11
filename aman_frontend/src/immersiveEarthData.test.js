import assert from "node:assert/strict";
import test from "node:test";

import { buildImmersiveEarthData, immersiveEarthMetric } from "./immersiveEarthData.js";

test("immersive Earth data keeps public coordinates and connects only declared context", () => {
  const scene = buildImmersiveEarthData({
    profileId: "report-1",
    residence: { id: "you", label: "User supplied", lat: 51, lng: -1 },
    regions: [
      { id: "gbr", label: "British in England and Scotland", lat: 52, lng: -2, modelScore: 63 },
      { id: "invalid", label: "Invalid", lat: 200, lng: 0 },
    ],
  });

  assert.equal(scene.profileId, "report-1");
  assert.equal(scene.points.length, 2);
  assert.equal(scene.regions.length, 1);
  assert.equal(scene.arcs.length, 1);
  assert.equal(scene.arcs[0].source.id, "you");
  assert.equal(scene.arcs[0].target.id, "gbr");
  assert.equal(immersiveEarthMetric(scene.regions[0], true), "63% modeled signal");
});

test("immersive Earth does not invent a user arc when no declared context exists", () => {
  const scene = buildImmersiveEarthData({
    regions: [{ id: "yri", label: "Yoruba in Ibadan", lat: 7.4, lng: 3.9 }],
  });

  assert.equal(scene.residence, null);
  assert.equal(scene.arcs.length, 0);
  assert.equal(immersiveEarthMetric(scene.regions[0], true), "Modeled signal n/a");
});
