import { useEffect, useMemo, useRef, useState } from "react";

import { safeExternalUrl } from "../api.js";
import { buildPopulationGlobe, DEMO_GLOBE, VISUALIZATION_SAFETY } from "../visualizationData.js";

function latLngToVector3(THREE, latitude, longitude, radius) {
  const phi = (90 - latitude) * (Math.PI / 180);
  const theta = (longitude + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function addArc(THREE, group, from, to, color, emphasis) {
  const start = latLngToVector3(THREE, from.lat, from.lng, 2.04);
  const end = latLngToVector3(THREE, to.lat, to.lng, 2.04);
  const midpoint = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(2.85);
  const curve = new THREE.QuadraticBezierCurve3(start, midpoint, end);
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(56));
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: emphasis ? 0.95 : 0.34,
  });
  const line = new THREE.Line(geometry, material);
  group.add(line);
  return line;
}

function addMarker(THREE, group, record, color, radius = 0.045) {
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 16, 16),
    new THREE.MeshBasicMaterial({ color }),
  );
  marker.position.copy(latLngToVector3(THREE, record.lat, record.lng, 2.06));
  group.add(marker);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(radius * 1.7, radius * 2.35, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.36, side: THREE.DoubleSide }),
  );
  halo.position.copy(marker.position);
  halo.lookAt(0, 0, 0);
  group.add(halo);
  return { marker, halo };
}

function applySelectedRegion(visuals, selectedId) {
  visuals.forEach((visual, id) => {
    const active = id === selectedId;
    const scale = active ? 1.55 : 1;
    visual.marker.scale.setScalar(scale);
    visual.halo.scale.setScalar(active ? 1.3 : 1);
    if (visual.arc) visual.arc.material.opacity = active ? 0.95 : 0.34;
  });
}

function regionMetric(region, isReferenceMap) {
  if (isReferenceMap) {
    return region.modelScore === null ? "n/a" : `${region.modelScore}% modeled`;
  }
  return `${region.share ?? region.percentage ?? region.percent ?? 0}%`;
}

export default function AncestryGlobe({
  populationLabel = "",
  populationMapData = null,
  dataStatus = null,
}) {
  const mountRef = useRef(null);
  const renderSceneRef = useRef(null);
  const regionVisualsRef = useRef(new Map());
  const [selectedId, setSelectedId] = useState(DEMO_GLOBE.regions[0]?.id);
  const [enteredViewport, setEnteredViewport] = useState(false);
  const [renderState, setRenderState] = useState("waiting");
  const referenceMap = useMemo(
    () => buildPopulationGlobe(populationMapData),
    [populationMapData],
  );
  const globeData = referenceMap || DEMO_GLOBE;
  const isReferenceMap = Boolean(referenceMap);
  const selectedRegion = globeData.regions.find((region) => region.id === selectedId) || globeData.regions[0];
  const citations = (globeData.meta.citations || [])
    .map((citation) => ({
      label: typeof citation?.label === "string" ? citation.label : "Open reference-panel source",
      url: safeExternalUrl(citation?.url),
    }))
    .filter((citation) => citation.url);

  useEffect(() => {
    setSelectedId(globeData.regions[0]?.id);
  }, [globeData.profileId]);

  useEffect(() => {
    applySelectedRegion(regionVisualsRef.current, selectedId);
    renderSceneRef.current?.();
  }, [selectedId]);

  useEffect(() => {
    const element = mountRef.current;
    if (!element) return undefined;
    if (!("IntersectionObserver" in window)) {
      setEnteredViewport(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setEnteredViewport(true);
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!enteredViewport || !mountRef.current) return undefined;

    let cancelled = false;
    let renderer;
    let scene;
    let renderScene;
    let resizeObserver;
    const removeListeners = [];
    setRenderState("loading");

    import("three")
      .then((THREE) => {
        if (cancelled || !mountRef.current) return;
        const mount = mountRef.current;
        scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
        camera.position.set(0, 0.25, 6.6);

        try {
          renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        } catch {
          setRenderState("fallback");
          return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setClearColor(0x05060b, 0);
        mount.replaceChildren(renderer.domElement);
        renderScene = () => renderer.render(scene, camera);
        renderSceneRef.current = renderScene;

        const globe = new THREE.Group();
        globe.rotation.set(-0.12, -0.48, 0.02);
        scene.add(globe);

        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(2, 72, 72),
          new THREE.MeshPhongMaterial({
            color: 0x263b75,
            emissive: 0x0c1533,
            shininess: 38,
            transparent: true,
            opacity: 0.88,
          }),
        );
        globe.add(sphere);

        const wireframe = new THREE.Mesh(
          new THREE.SphereGeometry(2.01, 30, 20),
          new THREE.MeshBasicMaterial({ color: 0x96a4f4, wireframe: true, transparent: true, opacity: 0.24 }),
        );
        globe.add(wireframe);

        const atmosphere = new THREE.Mesh(
          new THREE.SphereGeometry(2.08, 56, 56),
          new THREE.MeshBasicMaterial({
            color: 0x6b5cff,
            transparent: true,
            opacity: 0.12,
            side: THREE.BackSide,
          }),
        );
        globe.add(atmosphere);

        scene.add(new THREE.HemisphereLight(0x8fa0ff, 0x05060b, 2.35));
        const keyLight = new THREE.DirectionalLight(0xc9c4ff, 4.1);
        keyLight.position.set(4, 2, 5);
        scene.add(keyLight);

        const residence = globeData.residence;
        if (residence) addMarker(THREE, globe, residence, 0xffffff, 0.052);
        const regionVisuals = new Map();
        globeData.regions.forEach((region) => {
          const markerVisual = addMarker(THREE, globe, region, region.color, 0.043);
          let arc = null;
          if (residence && region.id !== residence.id) {
            arc = addArc(THREE, globe, residence, region, region.color, false);
          }
          regionVisuals.set(region.id, { ...markerVisual, arc });
        });
        regionVisualsRef.current = regionVisuals;
        applySelectedRegion(regionVisuals, selectedId);

        const stars = [];
        for (let index = 0; index < 260; index += 1) {
          const angle = index * 2.399963229728653;
          const y = 1 - (index / 259) * 2;
          const radius = Math.sqrt(1 - y * y);
          const distance = 10 + (index % 7) * 0.32;
          stars.push(
            Math.cos(angle) * radius * distance,
            y * distance,
            Math.sin(angle) * radius * distance,
          );
        }
        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(stars, 3));
        scene.add(new THREE.Points(
          starGeometry,
          new THREE.PointsMaterial({ color: 0xb9c0ff, size: 0.018, transparent: true, opacity: 0.48 }),
        ));

        let dragging = false;
        let previousX = 0;
        let previousY = 0;
        const onPointerDown = (event) => {
          dragging = true;
          previousX = event.clientX;
          previousY = event.clientY;
          renderer.domElement.setPointerCapture?.(event.pointerId);
        };
        const onPointerMove = (event) => {
          if (!dragging) return;
          globe.rotation.y += (event.clientX - previousX) * 0.006;
          globe.rotation.x += (event.clientY - previousY) * 0.004;
          globe.rotation.x = Math.max(-0.8, Math.min(0.8, globe.rotation.x));
          previousX = event.clientX;
          previousY = event.clientY;
          renderScene();
        };
        const onPointerUp = () => { dragging = false; };
        renderer.domElement.addEventListener("pointerdown", onPointerDown);
        renderer.domElement.addEventListener("pointermove", onPointerMove);
        renderer.domElement.addEventListener("pointerup", onPointerUp);
        renderer.domElement.addEventListener("pointercancel", onPointerUp);
        removeListeners.push(() => {
          renderer.domElement.removeEventListener("pointerdown", onPointerDown);
          renderer.domElement.removeEventListener("pointermove", onPointerMove);
          renderer.domElement.removeEventListener("pointerup", onPointerUp);
          renderer.domElement.removeEventListener("pointercancel", onPointerUp);
        });

        const resize = () => {
          const width = Math.max(320, mount.clientWidth);
          const height = Math.max(430, mount.clientHeight);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
          renderScene();
        };
        resize();
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mount);

        renderScene();
        setRenderState("ready");
      })
      .catch(() => {
        if (!cancelled) setRenderState("fallback");
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      removeListeners.forEach((remove) => remove());
      if (scene) {
        scene.traverse((object) => {
          object.geometry?.dispose?.();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
          else object.material?.dispose?.();
        });
      }
      renderer?.dispose();
      renderer?.forceContextLoss?.();
      regionVisualsRef.current = new Map();
      if (renderSceneRef.current === renderScene) renderSceneRef.current = null;
      if (mountRef.current) mountRef.current.replaceChildren();
    };
  }, [enteredViewport, globeData]);

  return (
    <section className="product-surface globe-surface" id="atlas" aria-labelledby="atlas-heading">
      <div className="surface-heading wide-heading">
        <div>
          <p className="section-kicker">02 · {isReferenceMap ? "Reference context" : "Ancestry context"}</p>
          <h2 id="atlas-heading">{isReferenceMap ? "Reference panels are coordinates—not conclusions." : "Residence is a pin. Heritage is a story."}</h2>
        </div>
        <span className="surface-badge">{isReferenceMap ? "Cited reference globe" : "Interactive 3D globe"}</span>
      </div>
      <p className="surface-lede">
        {isReferenceMap
          ? "Explore real, named public reference panels and a modeled non-medical trait signal. Their sampling locations do not locate you or assign an ancestry, ethnicity, or residence."
          : "Explore how a demo profile can live in one country and report family context from others. Real ancestry regions must come from the user—not be reverse-engineered by this audit layer."}
      </p>
      {populationMapData === null && dataStatus?.status === "loading" && (
        <p className="visual-data-status" role="status">Loading cited reference populations from the report-safe API…</p>
      )}
      {dataStatus?.status === "error" && (
        <p className="visual-data-status warning" role="status">
          The population-map API is unavailable, so this section is using its clearly labeled demo fallback.
          {dataStatus.error ? ` ${dataStatus.error}` : ""}
        </p>
      )}

      <div className="globe-layout">
        <div className="canvas-frame globe-canvas-frame">
          <div className="globe-static" aria-hidden="true">
            <svg className="static-arcs" viewBox="0 0 600 600">
              <path d="M300 300 Q178 92 118 210" />
              <path d="M300 300 Q420 82 476 205" />
              <path d="M300 300 Q510 276 468 366" />
              <path d="M300 300 Q392 500 316 474" />
            </svg>
            <div className="static-orb">
              <i className="orb-latitude one" /><i className="orb-latitude two" />
              <i className="orb-longitude one" /><i className="orb-longitude two" />
              <span className="static-marker marker-one" /><span className="static-marker marker-two" />
              <span className="static-marker marker-three" /><span className="static-marker marker-four" />
            </div>
          </div>
          <div ref={mountRef} className="globe-canvas" aria-hidden="true" data-render-state={renderState} />
          {renderState !== "ready" && (
            <div className="canvas-loader" role="status">
              <span className="loader-globe" aria-hidden="true" />
              <strong>{renderState === "fallback" ? "3D globe unavailable" : "Drawing the evidence globe"}</strong>
              <span>{renderState === "fallback" ? "The region list remains fully available." : "Loading locally with Three.js…"}</span>
            </div>
          )}
          <div className="residence-pin">
            <span className="pin-pulse" aria-hidden="true" />
            <small>{isReferenceMap ? (globeData.residence ? "Self-supplied broad context" : "No “you” marker") : "Demo residence"}</small>
            <strong>{isReferenceMap
              ? (globeData.residence?.label || "No recognized user-supplied label")
              : DEMO_GLOBE.residence.label}</strong>
          </div>
          <div className="canvas-caption"><span>Drag to rotate</span><span>Routes are illustrative, not migration claims</span></div>
        </div>

        <aside className="region-panel">
          <div className="demo-banner">
            <span>{isReferenceMap ? "Cited public panels" : "Demo profile"}</span>
            <strong>{isReferenceMap ? "Report-grounded trait model" : "Not derived from your upload"}</strong>
          </div>
          {populationLabel && (!isReferenceMap || !globeData.residence) && (
            <div className="supplied-context">
              <small>Your unplotted, user-supplied context</small>
              <strong>{populationLabel}</strong>
            </div>
          )}
          <div className="region-list" aria-label={isReferenceMap ? "Select a cited reference population" : "Select a demo ancestry-context region"}>
            {globeData.regions.map((region) => (
              <button
                type="button"
                className={selectedRegion.id === region.id ? "region-row active" : "region-row"}
                aria-pressed={selectedRegion.id === region.id}
                onClick={() => setSelectedId(region.id)}
                key={region.id}
              >
                <span className="region-color" style={{ backgroundColor: region.color }} />
                <span><strong>{region.label}</strong><small>{region.note || region.context}</small></span>
                <em>{regionMetric(region, isReferenceMap)}</em>
              </button>
            ))}
          </div>
          <div className="selected-region-card" aria-live="polite">
            <p className="inspector-label">{isReferenceMap ? "Selected reference population" : "Selected demo context"}</p>
            <h3>{selectedRegion.label}</h3>
            <p>{selectedRegion.detail || selectedRegion.note || selectedRegion.context}</p>
          </div>
        </aside>
      </div>

      <div className="truth-note globe-truth-note">
        <strong>{isReferenceMap ? "Reference-panel boundary" : (VISUALIZATION_SAFETY.globeTitle || "Never infer a person’s location from DNA.")}</strong>
        <span>{globeData.meta.disclaimer || VISUALIZATION_SAFETY.globe || "The globe accepts declared context or sourced aggregate geography only."}</span>
      </div>
      {citations.length > 0 && (
        <div className="visual-source-list" aria-label="Reference-population sources">
          {citations.map((citation) => (
            <a href={citation.url} target="_blank" rel="noreferrer" key={citation.url}>{citation.label}</a>
          ))}
        </div>
      )}

      <details className="data-fallback">
        <summary>{isReferenceMap ? "Read the reference globe as data" : "Read the demo globe as data"}</summary>
        <div className="data-table-scroll">
          <table>
            <caption>{isReferenceMap ? "Cited public reference populations; modeled similarity is not an ancestry percentage" : "Illustrative user-declared regions; percentages belong only to the synthetic demo profile"}</caption>
            <thead><tr><th scope="col">Region</th><th scope="col">{isReferenceMap ? "Modeled trait signal" : "Demo share"}</th><th scope="col">Coordinates</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              {globeData.regions.map((region) => (
                <tr key={region.id}>
                  <th scope="row">{region.label}</th>
                  <td>{regionMetric(region, isReferenceMap)}</td>
                  <td>{region.lat.toFixed(1)}, {region.lng.toFixed(1)}</td>
                  <td>{isReferenceMap ? "Cited reference-panel sampling location" : "User-declared demo context"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
