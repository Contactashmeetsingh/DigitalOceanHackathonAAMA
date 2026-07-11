const FALLBACK_COLOR = "#4285f4";

function isCoordinate(value, limit) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && Math.abs(numeric) <= limit;
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizedPoint(record, kind) {
  if (!record || !isCoordinate(record.lat, 90) || !isCoordinate(record.lng, 180)) {
    return null;
  }

  return {
    id: String(record.id || `${kind}-${record.lat}-${record.lng}`),
    label: String(record.label || "Reference location"),
    detail: String(record.detail || record.note || record.context || "Public reference geography."),
    lat: Number(record.lat),
    lng: Number(record.lng),
    color: typeof record.color === "string" ? record.color : FALLBACK_COLOR,
    kind,
    metricKind: record.metricKind === "distance" ? "distance" : "modeled-signal",
    modelScore: optionalNumber(record.modelScore),
    distance: optionalNumber(record.distance),
    rank: optionalNumber(record.rank),
    sampleCount: optionalNumber(record.sampleCount),
    thinReference: Boolean(record.thinReference),
    share: optionalNumber(record.share ?? record.percentage ?? record.percent),
  };
}

export function buildImmersiveEarthData(globeData) {
  const residence = normalizedPoint(globeData?.residence, "residence");
  const regions = Array.isArray(globeData?.regions)
    ? globeData.regions.map((region) => normalizedPoint(region, "reference")).filter(Boolean)
    : [];

  return {
    profileId: String(globeData?.profileId || "earth-preview"),
    residence,
    regions,
    points: residence ? [residence, ...regions] : regions,
    arcs: residence
      ? regions.map((region) => ({
        id: `${residence.id}-${region.id}`,
        source: residence,
        target: region,
        color: region.color,
      }))
      : [],
  };
}

export function immersiveEarthMetric(point, isReferenceMap) {
  if (!point) return "Select a reference";
  if (point.kind === "residence") return "User-supplied context";
  if (point.metricKind === "distance") {
    return point.distance === null
      ? "Distance withheld"
      : `Rank ${point.rank ?? "—"} · d=${point.distance.toFixed(6)}`;
  }
  if (isReferenceMap) {
    return point.modelScore === null ? "Modeled signal n/a" : `${point.modelScore}% modeled signal`;
  }
  return point.share === null ? "Preview context" : `${point.share}% demo context`;
}
