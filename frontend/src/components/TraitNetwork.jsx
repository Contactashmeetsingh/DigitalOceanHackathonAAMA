import { useEffect, useMemo, useRef, useState } from "react";

import { buildTraitNetwork, TRAIT_CATEGORIES } from "../visualizationData.js";

function endpointId(endpoint) {
  return typeof endpoint === "object" ? endpoint.id : endpoint;
}

function supportsWebGL2() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

export default function TraitNetwork({ reportData }) {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedId, setSelectedId] = useState("you");
  const [enteredViewport, setEnteredViewport] = useState(false);
  const [renderState, setRenderState] = useState("waiting");
  const network = useMemo(() => buildTraitNetwork(reportData), [reportData]);

  const visibleData = useMemo(() => {
    if (activeCategory === "all") return network;
    const nodes = network.nodes.filter(
      (node) => node.type !== "profile" || node.category === activeCategory,
    );
    const visibleIds = new Set(nodes.map((node) => node.id));
    const links = network.links.filter(
      (link) => visibleIds.has(endpointId(link.source)) && visibleIds.has(endpointId(link.target)),
    );
    return { ...network, nodes, links };
  }, [activeCategory, network]);

  const selectedNode = network.nodes.find((node) => node.id === selectedId) || network.nodes[0];
  const comparisonNodes = visibleData.nodes
    .filter((node) => node.type === "profile")
    .sort((a, b) => b.match - a.match);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    if (!("IntersectionObserver" in window)) {
      setEnteredViewport(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setEnteredViewport(true);
        if (graphRef.current) {
          if (entry.isIntersecting) graphRef.current.resumeAnimation();
          else graphRef.current.pauseAnimation();
        }
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!enteredViewport || !containerRef.current) return undefined;
    if (!supportsWebGL2()) {
      setRenderState("fallback");
      return undefined;
    }

    let cancelled = false;
    let graph;
    let resizeObserver;
    setRenderState("loading");

    import("3d-force-graph")
      .then(({ default: ForceGraph3D }) => {
        if (cancelled || !containerRef.current) return;
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const element = containerRef.current;
        const graphData = {
          nodes: visibleData.nodes.map((node) => ({ ...node })),
          links: visibleData.links.map((link) => ({ ...link })),
        };

        graph = new ForceGraph3D(element, { controlType: "orbit" })
          .width(Math.max(320, element.clientWidth))
          .height(Math.max(420, element.clientHeight))
          .backgroundColor("#05060b")
          .showNavInfo(false)
          .graphData(graphData)
          .nodeId("id")
          .nodeColor((node) => node.color)
          .nodeVal((node) => (node.type === "anchor" ? 14 : node.type === "trait" ? 5 : 1.25))
          .nodeResolution(8)
          .nodeOpacity(0.92)
          .linkColor((link) => link.color || "rgba(158, 143, 255, 0.24)")
          .linkOpacity(0.28)
          .linkWidth((link) => (link.kind === "anchor" ? 0.85 : 0.22))
          .enableNodeDrag(false)
          .cooldownTicks(prefersReducedMotion ? 45 : 110)
          .warmupTicks(20)
          .onNodeClick((node) => setSelectedId(node.id))
          .onEngineStop(() => {
            if (!cancelled && graph) {
              graph.zoomToFit(prefersReducedMotion ? 0 : 520, 72);
              if (prefersReducedMotion) graph.pauseAnimation();
            }
          });

        graphRef.current = graph;
        const renderer = graph.renderer();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

        resizeObserver = new ResizeObserver(([entry]) => {
          if (!graph) return;
          graph
            .width(Math.max(320, Math.floor(entry.contentRect.width)))
            .height(Math.max(420, Math.floor(entry.contentRect.height)));
        });
        resizeObserver.observe(element);
        setRenderState("ready");
      })
      .catch(() => {
        if (!cancelled) setRenderState("fallback");
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (graph) graph._destructor();
      if (graphRef.current === graph) graphRef.current = null;
      if (containerRef.current) containerRef.current.replaceChildren();
    };
  }, [enteredViewport, visibleData]);

  function focusNode(nodeId) {
    setSelectedId(nodeId);
    const graph = graphRef.current;
    if (!graph) return;
    const node = graph.graphData().nodes.find((item) => item.id === nodeId);
    if (!node || !Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.z)) return;
    const distance = Math.hypot(node.x, node.y, node.z) || 1;
    const ratio = 1 + 76 / distance;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650;
    graph.cameraPosition(
      { x: node.x * ratio, y: node.y * ratio, z: node.z * ratio },
      { x: node.x, y: node.y, z: node.z },
      duration,
    );
  }

  function resetView() {
    graphRef.current?.zoomToFit(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 520,
      72,
    );
    setSelectedId("you");
  }

  return (
    <section className="product-surface network-surface" id="compare" aria-labelledby="compare-heading">
      <div className="surface-heading wide-heading">
        <div>
          <p className="section-kicker">01 · Trait space</p>
          <h2 id="compare-heading">Find the signal in a hundred comparisons.</h2>
        </div>
        <div className="metric-lockup" aria-label="128 synthetic comparison profiles">
          <strong>128</strong><span>anonymous<br />preview profiles</span>
        </div>
      </div>
      <p className="surface-lede">
        Move through a 3D field of non-medical trait similarity. The layout is a product preview,
        not genetic distance—and no uploaded genome is shared with other people.
      </p>

      <div className="visual-toolbar" aria-label="Trait network controls">
        <div className="filter-group" aria-label="Filter comparison profiles">
          <button
            type="button"
            className={activeCategory === "all" ? "filter-chip active" : "filter-chip"}
            aria-pressed={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
          >
            All traits
          </button>
          {TRAIT_CATEGORIES.map((category) => (
            <button
              type="button"
              className={activeCategory === category.id ? "filter-chip active" : "filter-chip"}
              aria-pressed={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
              key={category.id}
            >
              <span className="chip-dot" style={{ backgroundColor: category.color }} />
              {category.label}
            </button>
          ))}
        </div>
        <button className="quiet-button" type="button" onClick={resetView}>Reset view</button>
      </div>

      <div className="network-layout">
        <div className="canvas-frame network-canvas-frame">
          <div
            ref={containerRef}
            className="network-canvas"
            aria-hidden="true"
            data-render-state={renderState}
          />
          {renderState !== "ready" && (
            <div className="canvas-loader" role="status">
              <span className="loader-orbit" aria-hidden="true" />
              <strong>{renderState === "fallback" ? "3D preview unavailable" : "Building the trait space"}</strong>
              <span>{renderState === "fallback" ? "Use the complete data table beside the visual." : "Preparing 135 nodes locally…"}</span>
            </div>
          )}
          <div className="canvas-caption">
            <span><i className="status-light" /> Synthetic preview</span>
            <span>Drag to orbit · scroll to zoom</span>
          </div>
        </div>

        <aside className="node-inspector" aria-live="polite">
          <p className="inspector-label">Selected node</p>
          <div className="inspector-title-row">
            <span className="node-swatch" style={{ backgroundColor: selectedNode.color }} />
            <div>
              <h3>{selectedNode.label}</h3>
              <p>{selectedNode.type === "profile" ? "Anonymous synthetic profile" : selectedNode.type === "trait" ? "Non-medical trait hub" : "Your private report anchor"}</p>
            </div>
          </div>
          <p className="inspector-summary">{selectedNode.summary}</p>
          {selectedNode.type === "profile" && (
            <dl className="compact-stats">
              <div><dt>Preview similarity</dt><dd>{selectedNode.match}%</dd></div>
              <div><dt>Trait lens</dt><dd>{selectedNode.categoryLabel || selectedNode.category}</dd></div>
            </dl>
          )}

          <p className="inspector-label nearby-label">Closest preview profiles</p>
          <div className="profile-shortlist">
            {comparisonNodes.slice(0, 6).map((node) => (
              <button type="button" onClick={() => focusNode(node.id)} key={node.id}>
                <span>{node.label}</span><strong>{node.match}%</strong>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <div className="truth-note">
        <strong>What this can show:</strong> an interface for de-identified, consented comparisons.
        <span><strong>What it cannot show:</strong> identity, relatedness, or ancestry inferred from force-layout proximity.</span>
      </div>

      <details className="data-fallback">
        <summary>Read all {comparisonNodes.length} visible comparison profiles as data</summary>
        <div className="data-table-scroll">
          <table>
            <caption>Deterministic synthetic comparison records used by this UI preview</caption>
            <thead><tr><th scope="col">Anonymous profile</th><th scope="col">Trait lens</th><th scope="col">Preview similarity</th><th scope="col">Data status</th></tr></thead>
            <tbody>
              {comparisonNodes.map((node) => (
                <tr key={node.id}>
                  <th scope="row"><button type="button" onClick={() => focusNode(node.id)}>{node.label}</button></th>
                  <td>{node.categoryLabel || node.category}</td>
                  <td>{node.match}%</td>
                  <td>Synthetic · no genome</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
