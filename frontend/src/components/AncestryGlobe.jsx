import { useEffect, useRef, useState } from "react";

import { DEMO_GLOBE, VISUALIZATION_SAFETY } from "../visualizationData.js";

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
  group.add(new THREE.Line(geometry, material));
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
}

function regionShare(region) {
  return region.share ?? region.percentage ?? region.percent ?? 0;
}

export default function AncestryGlobe({ populationLabel = "" }) {
  const mountRef = useRef(null);
  const [selectedId, setSelectedId] = useState(DEMO_GLOBE.regions[0]?.id);
  const [enteredViewport, setEnteredViewport] = useState(false);
  const [renderState, setRenderState] = useState("waiting");
  const selectedRegion = DEMO_GLOBE.regions.find((region) => region.id === selectedId) || DEMO_GLOBE.regions[0];

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
    let frameId;
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

        const globe = new THREE.Group();
        globe.rotation.set(-0.12, -0.48, 0.02);
        scene.add(globe);

        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(2, 72, 72),
          new THREE.MeshPhongMaterial({
            color: 0x11182b,
            emissive: 0x050816,
            shininess: 24,
            transparent: true,
            opacity: 0.96,
          }),
        );
        globe.add(sphere);

        const wireframe = new THREE.Mesh(
          new THREE.SphereGeometry(2.01, 30, 20),
          new THREE.MeshBasicMaterial({ color: 0x6473a6, wireframe: true, transparent: true, opacity: 0.11 }),
        );
        globe.add(wireframe);

        const atmosphere = new THREE.Mesh(
          new THREE.SphereGeometry(2.08, 56, 56),
          new THREE.MeshBasicMaterial({
            color: 0x6b5cff,
            transparent: true,
            opacity: 0.055,
            side: THREE.BackSide,
          }),
        );
        globe.add(atmosphere);

        scene.add(new THREE.HemisphereLight(0x8fa0ff, 0x05060b, 2.35));
        const keyLight = new THREE.DirectionalLight(0xc9c4ff, 4.1);
        keyLight.position.set(4, 2, 5);
        scene.add(keyLight);

        const residence = DEMO_GLOBE.residence;
        addMarker(THREE, globe, residence, 0xffffff, 0.052);
        DEMO_GLOBE.regions.forEach((region) => {
          const active = region.id === selectedRegion.id;
          addMarker(THREE, globe, region, region.color, active ? 0.07 : 0.043);
          addArc(THREE, globe, residence, region, region.color, active);
        });

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
        };
        resize();
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mount);

        const draw = () => {
          if (cancelled) return;
          renderer.render(scene, camera);
          frameId = requestAnimationFrame(draw);
        };
        draw();
        setRenderState("ready");
      })
      .catch(() => {
        if (!cancelled) setRenderState("fallback");
      });

    return () => {
      cancelled = true;
      if (frameId) cancelAnimationFrame(frameId);
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
      if (mountRef.current) mountRef.current.replaceChildren();
    };
  }, [enteredViewport, selectedRegion]);

  return (
    <section className="product-surface globe-surface" id="atlas" aria-labelledby="atlas-heading">
      <div className="surface-heading wide-heading">
        <div>
          <p className="section-kicker">02 · Ancestry context</p>
          <h2 id="atlas-heading">Residence is a pin. Heritage is a story.</h2>
        </div>
        <span className="surface-badge">Interactive 3D globe</span>
      </div>
      <p className="surface-lede">
        Explore how a demo profile can live in one country and report family context from others.
        Real ancestry regions must come from the user—not be reverse-engineered by this audit layer.
      </p>

      <div className="globe-layout">
        <div className="canvas-frame globe-canvas-frame">
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
            <small>Demo residence</small>
            <strong>{DEMO_GLOBE.residence.label}</strong>
          </div>
          <div className="canvas-caption"><span>Drag to rotate</span><span>Routes are illustrative, not migration claims</span></div>
        </div>

        <aside className="region-panel">
          <div className="demo-banner"><span>Demo profile</span><strong>Not derived from your upload</strong></div>
          {populationLabel && (
            <div className="supplied-context">
              <small>Your unplotted, user-supplied context</small>
              <strong>{populationLabel}</strong>
            </div>
          )}
          <div className="region-list" aria-label="Select a demo ancestry-context region">
            {DEMO_GLOBE.regions.map((region) => (
              <button
                type="button"
                className={selectedRegion.id === region.id ? "region-row active" : "region-row"}
                aria-pressed={selectedRegion.id === region.id}
                onClick={() => setSelectedId(region.id)}
                key={region.id}
              >
                <span className="region-color" style={{ backgroundColor: region.color }} />
                <span><strong>{region.label}</strong><small>{region.note || region.context}</small></span>
                <em>{regionShare(region)}%</em>
              </button>
            ))}
          </div>
          <div className="selected-region-card" aria-live="polite">
            <p className="inspector-label">Selected demo context</p>
            <h3>{selectedRegion.label}</h3>
            <p>{selectedRegion.detail || selectedRegion.note || selectedRegion.context}</p>
          </div>
        </aside>
      </div>

      <div className="truth-note globe-truth-note">
        <strong>{VISUALIZATION_SAFETY.globeTitle || "Never infer a person’s location from DNA."}</strong>
        <span>{VISUALIZATION_SAFETY.globe || "The globe accepts declared context or sourced aggregate geography only."}</span>
      </div>

      <details className="data-fallback">
        <summary>Read the demo globe as data</summary>
        <div className="data-table-scroll">
          <table>
            <caption>Illustrative user-declared regions; percentages belong only to the synthetic demo profile</caption>
            <thead><tr><th scope="col">Region</th><th scope="col">Demo share</th><th scope="col">Coordinates</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              {DEMO_GLOBE.regions.map((region) => (
                <tr key={region.id}>
                  <th scope="row">{region.label}</th>
                  <td>{regionShare(region)}%</td>
                  <td>{region.lat.toFixed(1)}, {region.lng.toFixed(1)}</td>
                  <td>User-declared demo context</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
