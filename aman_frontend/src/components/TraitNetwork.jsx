import { useEffect, useMemo, useRef, useState } from "react";

import { safeExternalUrl } from "../api.js";
import { buildComparisonNetwork, TRAIT_CATEGORIES } from "../visualizationData.js";

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

function StaticNetwork({ categories }) {
  const visibleCategories = categories.length ? categories : TRAIT_CATEGORIES;
  const center = { x: 430, y: 285 };
  const clusterRadius = visibleCategories.length === 1 ? 0 : 172;

  return (
    <svg viewBox="0 0 860 570" role="presentation">
      <defs>
        <radialGradient id="network-fallback-glow">
          <stop offset="0" stopColor="#4285f4" stopOpacity=".26" />
          <stop offset="1" stopColor="#4285f4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={center.x} cy={center.y} r="165" fill="url(#network-fallback-glow)" />
      {visibleCategories.map((category, categoryIndex) => {
        const angle = -Math.PI / 2 + (categoryIndex / visibleCategories.length) * Math.PI * 2;
        const hubX = center.x + Math.cos(angle) * clusterRadius;
        const hubY = center.y + Math.sin(angle) * clusterRadius;
        return (
          <g key={category.id}>
            <line x1={center.x} y1={center.y} x2={hubX} y2={hubY} stroke={category.color} strokeOpacity=".28" />
            {Array.from({ length: 11 }, (_, nodeIndex) => {
              const nodeAngle = angle + nodeIndex * 2.3999632297;
              const nodeRadius = 36 + (nodeIndex % 4) * 13;
              const x = hubX + Math.cos(nodeAngle) * nodeRadius;
              const y = hubY + Math.sin(nodeAngle) * nodeRadius * 0.72;
              return (
                <g key={`${category.id}-${nodeIndex}`}>
                  <line x1={hubX} y1={hubY} x2={x} y2={y} stroke={category.color} strokeOpacity=".12" />
                  <circle cx={x} cy={y} r={nodeIndex % 5 === 0 ? 3.2 : 2.1} fill={category.color} fillOpacity={nodeIndex % 3 === 0 ? ".92" : ".62"} />
                </g>
              );
            })}
            <circle cx={hubX} cy={hubY} r="7" fill={category.color} fillOpacity=".92" />
            <circle cx={hubX} cy={hubY} r="15" fill="none" stroke={category.color} strokeOpacity=".18" />
          </g>
        );
      })}
      <circle cx={center.x} cy={center.y} r="8" fill="#f8fafc" />
      <circle cx={center.x} cy={center.y} r="22" fill="none" stroke="#f8fafc" strokeOpacity=".16" />
    </svg>
  );
}

export default function TraitNetwork({ reportData, cohortData = null, dataStatus = null }) {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedId, setSelectedId] = useState("you");
  const [enteredViewport, setEnteredViewport] = useState(false);
  const [renderState, setRenderState] = useState("waiting");
  const network = useMemo(
    () => buildComparisonNetwork(cohortData, reportData),
    [cohortData, reportData],
  );
  const categories = network.meta.categories || TRAIT_CATEGORIES;
  const usesReportCohort = network.meta.source === "report-grounded-synthetic-cohort-api";
  const profileCount = network.meta.profileCount || 0;
  const citations = (network.meta.citations || [])
    .map((citation) => ({
      label: typeof citation?.label === "string" ? citation.label : "Open cohort source",
      url: safeExternalUrl(citation?.url),
    }))
    .filter((citation) => citation.url);

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
          .backgroundColor("#f8f9fa")
          .showNavInfo(false)
          .graphData(graphData)
          .nodeId("id")
          .nodeColor((node) => node.color)
          .nodeVal((node) => (node.type === "anchor" ? 14 : node.type === "trait" || node.type === "group" ? 5 : 1.25))
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

  useEffect(() => {
    setActiveCategory("all");
    setSelectedId("you");
  }, [network.meta.source]);

  useEffect(() => {
    if (!visibleData.nodes.some((node) => node.id === selectedId)) {
      setSelectedId("you");
    }
  }, [selectedId, visibleData]);

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
        <div className="metric-lockup" aria-label={`${profileCount} synthetic comparison profiles`}>
          <strong>{profileCount}</strong><span>synthetic<br />comparison profiles</span>
        </div>
      </div>
      <p className="surface-lede">
        {usesReportCohort
          ? "Move through a report-grounded, synthetic cohort generated from published broad-group frequency models. Similarity is not ancestry, identity, or genetic distance."
          : "Move through a 3D field of non-medical trait similarity. The layout is a product preview, not genetic distance—and no uploaded genome is shared with other people."}
      </p>
      {reportData && dataStatus?.status === "loading" && (
        <p className="visual-data-status" role="status">Refreshing the cited synthetic cohort from the report-safe API…</p>
      )}
      {reportData && dataStatus?.status === "error" && (
        <p className="visual-data-status warning" role="status">
          The cohort API is unavailable, so this section is using its labeled local synthetic fallback.
          {dataStatus.error ? ` ${dataStatus.error}` : ""}
        </p>
      )}

      <div className="visual-toolbar" aria-label="Trait network controls">
        <div className="filter-group" aria-label="Filter comparison profiles">
          <button
            type="button"
            className={activeCategory === "all" ? "filter-chip active" : "filter-chip"}
            aria-pressed={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
          >
            {usesReportCohort ? "All models" : "All traits"}
          </button>
          {categories.map((category) => (
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
          <div className="network-static" aria-hidden="true">
            <StaticNetwork categories={activeCategory === "all"
              ? categories
              : categories.filter((category) => category.id === activeCategory)} />
          </div>
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
              <span>{renderState === "fallback" ? "Use the complete data table beside the visual." : `Preparing ${network.nodes.length} safe display nodes…`}</span>
            </div>
          )}
          <div className="canvas-caption">
            <span><i className="status-light" /> {usesReportCohort ? "Report-grounded synthetic cohort" : "Synthetic preview"}</span>
            <span>Drag to orbit · scroll to zoom</span>
          </div>
        </div>

        <aside className="node-inspector" aria-live="polite">
          <p className="inspector-label">Selected node</p>
          <div className="inspector-title-row">
            <span className="node-swatch" style={{ backgroundColor: selectedNode.color }} />
            <div>
              <h3>{selectedNode.label}</h3>
              <p>{selectedNode.type === "profile" ? "Anonymous synthetic profile" : selectedNode.type === "trait" ? "Non-medical trait hub" : selectedNode.type === "group" ? "Broad frequency-model hub" : "Your private report anchor"}</p>
            </div>
          </div>
          <p className="inspector-summary">{selectedNode.summary}</p>
          {selectedNode.type === "profile" && (
            <dl className="compact-stats">
              <div><dt>Preview similarity</dt><dd>{selectedNode.match}%</dd></div>
              <div><dt>{usesReportCohort ? "Reference model" : "Trait lens"}</dt><dd>{selectedNode.categoryLabel || selectedNode.category}</dd></div>
            </dl>
          )}

          <p className="inspector-label nearby-label">Closest synthetic profiles</p>
          <div className="profile-shortlist">
            {comparisonNodes.slice(0, 6).map((node) => (
              <button type="button" onClick={() => focusNode(node.id)} key={node.id}>
                <span>{node.label}</span><strong>{node.match}%</strong>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <div className="truth-note cohort-truth-note">
        <strong>{usesReportCohort ? "Synthetic cohort boundary" : "Preview boundary"}</strong>
        <span>{network.meta.disclaimer || "This visual demonstrates a safe comparison interface. It does not represent real people, identity, relatedness, or ancestry inferred from force-layout proximity."}</span>
      </div>
      {citations.length > 0 && (
        <div className="visual-source-list" aria-label="Synthetic cohort sources">
          {citations.map((citation) => (
            <a href={citation.url} target="_blank" rel="noreferrer" key={citation.url}>{citation.label}</a>
          ))}
        </div>
      )}

      <details className="data-fallback">
        <summary>Read all {comparisonNodes.length} visible comparison profiles as data</summary>
        <div className="data-table-scroll">
          <table>
            <caption>{usesReportCohort ? "Report-grounded synthetic comparison records; genotype calls are excluded from this table" : "Deterministic synthetic comparison records used by this UI preview"}</caption>
            <thead><tr><th scope="col">Anonymous profile</th><th scope="col">{usesReportCohort ? "Reference model" : "Trait lens"}</th><th scope="col">Preview similarity</th><th scope="col">Data status</th></tr></thead>
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
