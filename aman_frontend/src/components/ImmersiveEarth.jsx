import { useEffect, useMemo, useRef, useState } from "react";

import { safeExternalUrl } from "../api.js";
import { buildImmersiveEarthData, immersiveEarthMetric } from "../immersiveEarthData.js";
import { buildReferenceEarth } from "../referenceEarthData.js";
import { buildPopulationGlobe, DEMO_GLOBE, VISUALIZATION_SAFETY } from "../visualizationData.js";
import "./ImmersiveEarth.css";

const COUNTRY_DATA_URL = "/data/ne_110m_admin_0_countries.geojson";

function applyScene(globe, scene, selectedId) {
  const selected = selectedId || scene.regions[0]?.id;
  globe
    .pointsData(scene.points)
    .pointLat("lat")
    .pointLng("lng")
    .pointColor((point) => point.kind === "residence" ? "#ffffff" : point.color)
    .pointAltitude((point) => point.id === selected ? 0.09 : point.kind === "residence" ? 0.065 : 0.035)
    .pointRadius((point) => {
      if (point.id === selected) return 0.34;
      if (point.kind === "residence") return 0.25;
      return 0.14 + Math.min(0.11, Math.sqrt(point.sampleCount || 0) / 90);
    })
    .pointResolution(18)
    .pointsTransitionDuration(420)
    .pointLabel(() => "")
    .ringsData(scene.points.filter((point) => point.kind === "residence" || point.id === selected))
    .ringLat("lat")
    .ringLng("lng")
    .ringColor((point) => () => point.kind === "residence" ? "rgba(255,255,255,.62)" : `${point.color}bb`)
    .ringMaxRadius((point) => point.id === selected ? 4.2 : 2.7)
    .ringPropagationSpeed(1.35)
    .ringRepeatPeriod(1450)
    .arcsData(scene.arcs)
    .arcStartLat((arc) => arc.source.lat)
    .arcStartLng((arc) => arc.source.lng)
    .arcEndLat((arc) => arc.target.lat)
    .arcEndLng((arc) => arc.target.lng)
    .arcColor((arc) => arc.target.id === selected
      ? ["rgba(255,255,255,.92)", `${arc.color}ff`]
      : ["rgba(255,255,255,.16)", `${arc.color}5c`])
    .arcAltitudeAutoScale(0.32)
    .arcStroke((arc) => arc.target.id === selected ? 0.72 : 0.24)
    .arcDashLength(0.42)
    .arcDashGap(0.72)
    .arcDashAnimateTime(2300)
    .arcsTransitionDuration(500)
    .arcLabel(() => "");
}

export default function ImmersiveEarth({
  populationLabel = "",
  populationMapData = null,
  geneticCloseness = null,
  dataStatus = null,
}) {
  const mountRef = useRef(null);
  const globeRef = useRef(null);
  const [enteredViewport, setEnteredViewport] = useState(false);
  const [renderState, setRenderState] = useState("waiting");
  const [selectedId, setSelectedId] = useState("");
  const [hoveredId, setHoveredId] = useState("");

  const distanceMap = useMemo(() => buildReferenceEarth(geneticCloseness), [geneticCloseness]);
  const traitMap = useMemo(() => buildPopulationGlobe(populationMapData), [populationMapData]);
  const globeData = distanceMap || traitMap || DEMO_GLOBE;
  const isDistanceMap = Boolean(distanceMap);
  const isReferenceMap = Boolean(distanceMap || traitMap);
  const scene = useMemo(() => buildImmersiveEarthData(globeData), [globeData]);
  const activePoint = scene.points.find((point) => point.id === (hoveredId || selectedId))
    || scene.regions[0]
    || scene.residence;
  const safetyCopy = globeData.meta?.disclaimer
    || VISUALIZATION_SAFETY.globe
    || "This map never infers a person's location from DNA.";
  const citations = (globeData.meta?.citations || [])
    .map((citation) => ({ label: citation?.label || "Public reference source", url: safeExternalUrl(citation?.url) }))
    .filter((citation) => citation.url);

  useEffect(() => {
    setSelectedId(scene.regions[0]?.id || scene.residence?.id || "");
  }, [scene.profileId]);

  useEffect(() => {
    const element = mountRef.current;
    if (!element || !("IntersectionObserver" in window)) {
      setEnteredViewport(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setEnteredViewport(true);
        if (globeRef.current) {
          if (entry.isIntersecting) globeRef.current.resumeAnimation();
          else globeRef.current.pauseAnimation();
        }
      },
      { rootMargin: "180px 0px", threshold: 0.02 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!enteredViewport || !mountRef.current) return undefined;

    let cancelled = false;
    let globe;
    let resizeObserver;
    let readyTimer;
    const controller = new AbortController();
    setRenderState("loading");

    import("globe.gl")
      .then(({ default: Globe }) => {
        if (cancelled || !mountRef.current) return;
        const mount = mountRef.current;
        globe = new Globe(mount)
          .width(Math.max(320, mount.clientWidth))
          .height(Math.max(520, mount.clientHeight))
          .backgroundColor("rgba(0,0,0,0)")
          .showGlobe(true)
          .showGraticules(true)
          .showAtmosphere(true)
          .atmosphereColor("#4285f4")
          .atmosphereAltitude(0.19)
          .polygonCapColor(() => "rgba(102,157,246,.36)")
          .polygonSideColor(() => "rgba(23,78,166,.08)")
          .polygonStrokeColor(() => "rgba(232,240,254,.28)")
          .polygonAltitude(0.008)
          .polygonLabel(() => "")
          .enablePointerInteraction(true)
          .onPointClick((point) => setSelectedId(point.id))
          .onPointHover((point) => setHoveredId(point?.id || ""))
          .onGlobeReady(() => {
            if (!cancelled) setRenderState("ready");
          });

        readyTimer = window.setTimeout(() => {
          if (cancelled || !globe) return;
          const contextLost = globe.renderer?.()?.getContext?.()?.isContextLost?.();
          setRenderState(contextLost ? "fallback" : "ready");
        }, 1600);

        const material = globe.globeMaterial();
        material.color?.set?.("#123c7a");
        material.emissive?.set?.("#071a3b");
        material.emissiveIntensity = 0.72;
        material.shininess = 22;

        const controls = globe.controls();
        controls.enablePan = false;
        controls.minDistance = 128;
        controls.maxDistance = 420;
        controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        controls.autoRotateSpeed = 0.32;

        globe.pointOfView({ lat: 18, lng: 12, altitude: 1.78 }, 0);
        applyScene(globe, scene, selectedId);
        globeRef.current = globe;

        fetch(COUNTRY_DATA_URL, { signal: controller.signal })
          .then((response) => response.ok ? response.json() : Promise.reject(new Error("Country geometry unavailable")))
          .then((countries) => {
            if (!cancelled && Array.isArray(countries?.features)) {
              globe.polygonsData(countries.features.filter((feature) => feature?.properties?.ISO_A2 !== "AQ"));
            }
          })
          .catch(() => {});

        const resize = () => {
          if (!mountRef.current || !globe) return;
          globe
            .width(Math.max(320, mountRef.current.clientWidth))
            .height(Math.max(520, mountRef.current.clientHeight));
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mount);
      })
      .catch(() => {
        if (!cancelled) setRenderState("fallback");
      });

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(readyTimer);
      resizeObserver?.disconnect();
      if (globeRef.current === globe) globeRef.current = null;
      globe?._destructor?.();
      if (mountRef.current) mountRef.current.replaceChildren();
    };
  }, [enteredViewport, scene.profileId]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    applyScene(globe, scene, selectedId);
    const selected = scene.points.find((point) => point.id === selectedId);
    if (selected) globe.pointOfView({ lat: selected.lat, lng: selected.lng, altitude: 1.72 }, 850);
  }, [scene, selectedId]);

  return (
    <section className="immersive-earth" id="atlas" aria-labelledby="immersive-earth-heading">
      <div className="immersive-earth-stage" ref={mountRef} aria-hidden="true" data-render-state={renderState} />
      <div className="immersive-earth-fallback" aria-hidden="true">
        <svg className="fallback-earth-orb" viewBox="0 0 1000 500" role="presentation">
          <defs>
            <radialGradient id="fallback-earth-sea" cx="34%" cy="28%" r="74%">
              <stop offset="0" stopColor="#4285f4" />
              <stop offset=".58" stopColor="#174ea6" />
              <stop offset="1" stopColor="#071a3b" />
            </radialGradient>
            <clipPath id="fallback-earth-clip"><circle cx="500" cy="250" r="232" /></clipPath>
          </defs>
          <circle cx="500" cy="250" r="232" fill="url(#fallback-earth-sea)" />
          <g clipPath="url(#fallback-earth-clip)" className="fallback-earth-grid">
            <ellipse cx="500" cy="250" rx="232" ry="72" />
            <ellipse cx="500" cy="250" rx="232" ry="142" />
            <ellipse cx="500" cy="250" rx="82" ry="232" />
            <ellipse cx="500" cy="250" rx="156" ry="232" />
          </g>
          <g clipPath="url(#fallback-earth-clip)" className="fallback-earth-land">
            <path d="M55 112 L90 75 155 58 210 82 250 120 235 155 205 160 188 195 155 205 130 180 95 170 70 142Z" />
            <path d="M230 210 L275 218 300 252 290 296 270 340 248 393 225 360 218 305 202 260Z" />
            <path d="M440 95 L480 75 525 86 548 112 530 130 492 125 470 145 442 132Z" />
            <path d="M474 152 L528 150 558 185 548 245 522 310 488 288 468 230 452 190Z" />
            <path d="M530 92 L595 62 700 58 780 88 860 100 930 142 902 185 830 175 780 212 715 185 665 200 620 170 570 165 548 126Z" />
            <path d="M790 305 L836 288 890 304 914 340 884 374 830 368 802 342Z" />
            <path d="M305 42 L354 24 400 44 380 78 334 84Z" />
          </g>
          <circle cx="500" cy="250" r="232" className="fallback-earth-outline" />
        </svg>
      </div>
      <div className="immersive-earth-shade" aria-hidden="true" />

      <header className="immersive-earth-copy">
        <p className="immersive-earth-kicker"><span>02</span> {isDistanceMap ? "1000 Genomes Earth" : "Reference Earth"}</p>
        <h2 id="immersive-earth-heading">
          {isDistanceMap ? "Explore your reference distances at full scale." : "See the reference world at full scale."}
        </h2>
        <p>
          {isDistanceMap
            ? "Rotate all 26 populations from the Docker-shipped Phase 3 panel. Color shows this upload's relative distance rank; point size shows reference N. Neither assigns ancestry or identity."
            : "Rotate a globe of public reference-panel locations. Coordinates describe where samples were collected—not where your DNA says you belong."}
        </p>
      </header>

      <div className="immersive-earth-status" aria-live="polite">
        <span className={`earth-status-dot ${renderState}`} />
        <div>
          <small>{isDistanceMap ? "Docker reference online" : isReferenceMap ? "Report-grounded view" : "Safe preview"}</small>
          <strong>{renderState === "fallback"
            ? "Accessible map mode"
            : isDistanceMap
              ? `${globeData.meta.referenceSampleCount?.toLocaleString() || "2,504"} samples · ${scene.regions.length} populations`
              : `${scene.regions.length} reference locations`}</strong>
        </div>
      </div>

      {!isDistanceMap && dataStatus?.status === "loading" && (
        <p className="immersive-earth-notice" role="status">Loading cited reference populations…</p>
      )}
      {!isDistanceMap && dataStatus?.status === "error" && (
        <p className="immersive-earth-notice warning" role="status">
          Live reference data is unavailable; showing the labeled preview.
        </p>
      )}
      {isDistanceMap && !globeData.meta.available && (
        <p className="immersive-earth-notice warning" role="status">
          {globeData.meta.message || "Distances are withheld for this upload; the Docker reference geography remains available."}
        </p>
      )}

      <aside className="immersive-earth-inspector" aria-live="polite">
        <span className="earth-inspector-color" style={{ backgroundColor: activePoint?.color || "#4285f4" }} />
        <div>
          <small>{activePoint?.kind === "residence" ? "Declared context" : "Selected reference"}</small>
          <h3>{activePoint?.label || "Reference geography"}</h3>
          <p>{activePoint?.detail || "Select a public reference location to inspect it."}</p>
        </div>
        <strong>{immersiveEarthMetric(activePoint, isReferenceMap)}</strong>
      </aside>

      <nav className="immersive-earth-locations" aria-label="Select a reference population on the globe">
        {scene.regions.map((region) => (
          <button
            type="button"
            className={region.id === selectedId ? "active" : ""}
            aria-pressed={region.id === selectedId}
            onClick={() => setSelectedId(region.id)}
            key={region.id}
          >
            <span style={{ backgroundColor: region.color }} />
            {region.label}
          </button>
        ))}
      </nav>

      <div className="immersive-earth-footer">
        <span>Drag to orbit · scroll to zoom</span>
        <span className="immersive-earth-boundary" title={safetyCopy}>{safetyCopy}</span>
        {citations[0] && <a href={citations[0].url} target="_blank" rel="noreferrer">Open public source ↗</a>}
      </div>

      <p className="visually-hidden">
        {populationLabel ? `User-supplied context: ${populationLabel}. ` : ""}{safetyCopy}
      </p>
    </section>
  );
}
