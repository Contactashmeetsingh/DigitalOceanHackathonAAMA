export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function distanceExtent(populations) {
  const values = populations
    .map((population) => Number(population.distance))
    .filter(Number.isFinite);
  return values.length ? [Math.min(...values), Math.max(...values)] : [0, 1];
}

export function projectPopulation3d(population, rotation, extent, width = 640, height = 460) {
  const source = Array.isArray(population.mds_direction) ? population.mds_direction : [0, 0, 1];
  const magnitude = Math.hypot(...source) || 1;
  let [x, y, z] = source.map((value) => Number(value || 0) / magnitude);

  const yaw = Number(rotation.yaw || 0);
  const pitch = Number(rotation.pitch || 0);
  const yawX = x * Math.cos(yaw) + z * Math.sin(yaw);
  const yawZ = -x * Math.sin(yaw) + z * Math.cos(yaw);
  x = yawX;
  z = yawZ;
  const pitchY = y * Math.cos(pitch) - z * Math.sin(pitch);
  const pitchZ = y * Math.sin(pitch) + z * Math.cos(pitch);
  y = pitchY;
  z = pitchZ;

  const distance = Number(population.distance);
  const [minimum, maximum] = extent;
  const normalizedDistance = Number.isFinite(distance)
    ? (distance - minimum) / Math.max(maximum - minimum, 1e-9)
    : 0.5;
  const radius = 92 + normalizedDistance * 118;
  const perspective = (Number(rotation.zoom || 1) * 520) / (560 - z * 90);
  return {
    x: width / 2 + x * radius * perspective,
    y: height / 2 - y * radius * perspective,
    z,
    scale: clamp(0.82 + z * 0.16, 0.62, 1.08),
  };
}

export function projectGeo(location, width = 1000, height = 500) {
  const longitude = clamp(Number(location?.lon || 0), -180, 180);
  const latitude = clamp(Number(location?.lat || 0), -90, 90);
  return {
    x: ((longitude + 180) / 360) * width,
    y: ((90 - latitude) / 180) * height,
  };
}

export function markerRadius(sampleCount, minimum = 4, maximum = 10) {
  const radius = Math.sqrt(Math.max(0, Number(sampleCount) || 0)) / 1.25;
  return clamp(radius, minimum, maximum);
}
