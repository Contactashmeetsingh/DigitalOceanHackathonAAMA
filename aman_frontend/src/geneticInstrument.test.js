import test from "node:test";
import assert from "node:assert/strict";

import {
  distanceExtent,
  markerRadius,
  projectGeo,
  projectPopulation3d,
} from "./geneticInstrument.js";

test("geographic projection uses a bounded equirectangular coordinate system", () => {
  assert.deepEqual(projectGeo({ lat: 0, lon: 0 }), { x: 500, y: 250 });
  assert.deepEqual(projectGeo({ lat: 120, lon: -240 }), { x: 0, y: 0 });
});

test("3D projection is deterministic and responds to orbit and distance", () => {
  const near = { distance: 0.2, mds_direction: [1, 0, 0] };
  const far = { distance: 0.4, mds_direction: [1, 0, 0] };
  const extent = distanceExtent([near, far]);
  const first = projectPopulation3d(near, { yaw: 0, pitch: 0, zoom: 1 }, extent);
  const second = projectPopulation3d(near, { yaw: 0, pitch: 0, zoom: 1 }, extent);
  const rotated = projectPopulation3d(near, { yaw: Math.PI / 2, pitch: 0, zoom: 1 }, extent);
  const farther = projectPopulation3d(far, { yaw: 0, pitch: 0, zoom: 1 }, extent);

  assert.deepEqual(first, second);
  assert.notEqual(first.x, rotated.x);
  assert.ok(farther.x > first.x);
});

test("marker sizes are sample-driven and capped", () => {
  assert.ok(markerRadius(100) > markerRadius(25));
  assert.equal(markerRadius(1), 4);
  assert.equal(markerRadius(10000), 10);
});
