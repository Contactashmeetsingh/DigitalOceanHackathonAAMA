import { useEffect, useRef, useState } from "react";

import { analyzeGenome } from "./api.js";
import AncestryGlobe from "./components/AncestryGlobe.jsx";
import ResearchWorkspace from "./components/ResearchWorkspace.jsx";
import TraitNetwork from "./components/TraitNetwork.jsx";
import { TOPMED_PANEL } from "./referencePanelData.js";
import { canReplaceSelectedFile } from "./uploadInteraction.js";

const ANSWER_CATEGORIES = [
  {
    id: "interpretation",
    title: "Result Interpretation",
    description: "Translate broad labels and measured variants without redoing ancestry inference.",
    question: "What does my broad ancestry result actually say—and what does it not say?",
  },
  {
    id: "reference-panels",
    title: "Reference-Panel Transparency",
    description: "See how comparison-panel size and representation affect confidence.",
    question: "Why is this result less specific for some populations?",
  },
  {
    id: "history",
    title: "Population History",
    description: "Put broad patterns in context without turning them into exact ethnicity claims.",
    question: "What population history can explain overlap in broad regional results?",
  },
  {
    id: "traits",
    title: "Trait Validation",
    description: "Review only allowlisted, non-medical traits and how well each association travels.",
    question: "How strong is the evidence for this non-medical trait in people like me?",
  },
  {
    id: "research",
    title: "Research Bridge",
    description: "Find dated, consent-aware programs working to close representation gaps.",
    question: "Which research programs are improving representation for my broad population?",
  },
  {
    id: "limits",
    title: "Honest Limits",
    description: "Ask for the boundary: no diagnoses, exact ethnicity, or unsupported certainty.",
    question: "What can this app not responsibly conclude from my file?",
  },
];

const TRUST_PROMISES = [
  {
    icon: "vault",
    title: "In-memory handling",
    description: "The app processes the upload in memory and does not retain the raw genome.",
  },
  {
    icon: "compass",
    title: "No ancestry re-inference",
    description: "A broad label is optional context copied from an existing result—not a DNA conclusion.",
  },
  {
    icon: "shield",
    title: "Default-deny boundaries",
    description: "Health, exact-ethnicity, and off-allowlist requests remain out of scope.",
  },
];

function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "upload") {
    return <svg {...common}><path d="M12 16V3" /><path d="m7 8 5-5 5 5" /><path d="M5 16.5v3A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-3" /></svg>;
  }
  if (name === "check") {
    return <svg {...common}><path d="m5 12 4.3 4.3L19 6.6" /></svg>;
  }
  if (name === "vault") {
    return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 3v5h8V3" /><path d="M9 14h6" /></svg>;
  }
  if (name === "compass") {
    return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="m14.7 9.3-1.8 3.6-3.6 1.8 1.8-3.6Z" /></svg>;
  }
  if (name === "shield") {
    return <svg {...common}><path d="M12 3.5 19 6v5.3c0 4.5-2.8 7.7-7 9.2-4.2-1.5-7-4.7-7-9.2V6Z" /><path d="m9.1 12 1.9 1.9 4-4" /></svg>;
  }
  if (name === "map") {
    return <svg {...common}><path d="m3.5 6.5 5-2 7 2 5-2v13l-5 2-7-2-5 2Z" /><path d="M8.5 4.5v13M15.5 6.5v13" /></svg>;
  }
  if (name === "layers") {
    return <svg {...common}><path d="m12 3 8.5 4.5L12 12 3.5 7.5Z" /><path d="m3.5 12 8.5 4.5 8.5-4.5" /><path d="m3.5 16.5 8.5 4.5 8.5-4.5" /></svg>;
  }
  return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
}

export default function App() {
  const [file, setFile] = useState(null);
  const [populationLabel, setPopulationLabel] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { data } | { error }
  const [fileError, setFileError] = useState("");
  const inputRef = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => {
    if (result && resultRef.current) resultRef.current.focus();
  }, [result]);

  function pickFile(candidate) {
    if (!canReplaceSelectedFile(loading)) return;
    setResult(null);
    setFileError("");
    if (!candidate) {
      setFile(null);
      return;
    }
    if (!candidate.name.toLowerCase().endsWith(".txt")) {
      setFile(null);
      setFileError("Choose a 23andMe raw-data file ending in .txt.");
      return;
    }
    if (candidate.size === 0) {
      setFile(null);
      setFileError("That file is empty. Choose the original 23andMe raw-data export.");
      return;
    }
    setFile(candidate);
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (!canReplaceSelectedFile(loading)) return;
    pickFile(event.dataTransfer.files?.[0]);
  }

  function onDropzoneKeyDown(event) {
    if (!canReplaceSelectedFile(loading)) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!file) {
      setFileError("Choose a non-empty 23andMe .txt file before analyzing.");
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const data = await analyzeGenome({ file, populationLabel });
      setResult({ data, submittedPopulationLabel: populationLabel.trim() });
    } catch (error) {
      setResult({
        error: error instanceof Error
          ? error.message
          : "We could not reach the analysis service. Check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#analyze">Skip to private DNA analysis</a>
      <header className="global-header">
        <div className="header-inner">
          <a className="brand-lockup" href="#overview" aria-label="Ancestry Audit Layer home">
            <span className="brand-glyph" aria-hidden="true"><i /><i /><i /></span>
            <span>Ancestry <strong>Audit</strong></span>
          </a>
          <nav className="site-nav" aria-label="Product sections">
            <a href="#compare">Trait space</a>
            <a href="#atlas">Atlas</a>
            <a href="#research">Research</a>
          </nav>
          <a className="header-cta" href="#analyze">Audit my data</a>
        </div>
      </header>

      <main id="main-content">
        <section className="hero-surface" id="overview" aria-labelledby="hero-heading">
          <div className="hero-copy-new">
            <p className="backed-label"><span>DO</span> BUILT ON DIGITALOCEAN GRADIENT AI</p>
            <h1 id="hero-heading">Your DNA result,<br /><em>with receipts.</em></h1>
            <p>
              Upload a 23andMe export and see the evidence around it: measured traits,
              comparison context, geographic nuance, and the limits a responsible answer keeps.
            </p>
            <div className="hero-actions-new">
              <a className="hero-primary" href="#analyze">Start a private audit <span>↘</span></a>
              <a className="hero-secondary" href="#compare">Explore the preview</a>
            </div>
            <div className="hero-proof" aria-label="Product proof points">
              <span><strong>In memory</strong>Raw file handling</span>
              <span><strong>6</strong>Vetted trait lenses</span>
              <span><strong>128</strong>Synthetic comparisons</span>
            </div>
          </div>

          <div className="product-window hero-window" aria-label="Ancestry Audit product preview">
            <div className="window-bar">
              <span className="window-dots"><i /><i /><i /></span>
              <span>private_report — Ancestry Audit</span>
              <span className="window-state"><i /> protected</span>
            </div>
            <div className="hero-window-body">
              <div className="mini-sidebar">
                <span className="mini-logo"><i /><i /><i /></span>
                <i className="active" /><i /><i /><i />
                <span className="mini-avatar">AA</span>
              </div>
              <div className="mini-dashboard">
                <div className="mini-dashboard-head"><div><small>Your evidence map</small><strong>Trait space</strong></div><span>128 profiles</span></div>
                <div className="mini-graph" aria-hidden="true">
                  <span className="mini-core" />
                  {Array.from({ length: 30 }, (_, index) => (
                    <i style={{ "--index": index }} key={index} />
                  ))}
                  <svg viewBox="0 0 420 220" preserveAspectRatio="none"><path d="M209 110 55 46M209 110 92 184M209 110 352 42M209 110 366 174M209 110 204 18M209 110 212 204" /></svg>
                </div>
                <div className="mini-metrics">
                  <span><small>Measured</small><strong>6 traits</strong></span>
                  <span><small>Evidence mode</small><strong>Conservative</strong></span>
                  <span><small>Raw data retained</small><strong>Never</strong></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="safeguard-rail" aria-label="Product safeguards">
          {TRUST_PROMISES.map((promise, index) => (
            <article key={promise.title}>
              <span className="safeguard-index">0{index + 1}</span>
              <span className="safeguard-icon"><Icon name={promise.icon} size={19} /></span>
              <div><h2>{promise.title}</h2><p>{promise.description}</p></div>
            </article>
          ))}
        </section>

        <section className="product-surface analyze-surface" id="analyze" aria-labelledby="upload-heading" aria-busy={loading}>
          <div className="surface-heading wide-heading">
            <div><p className="section-kicker">00 · Begin with the file</p><h2 id="upload-heading">Open the report. Keep the genome private.</h2></div>
            <span className="surface-badge secure-badge"><Icon name="vault" size={15} /> In-memory processing</span>
          </div>
          <p className="surface-lede">The current live backend reads the upload, retains only its reviewed allowlist, and returns a boundary-checked report—not the raw genome.</p>

          <div className="upload-layout">
            <form className="upload-form" onSubmit={onSubmit}>
              <label
                className={`dropzone${dragging ? " drag" : ""}`}
                tabIndex={loading ? -1 : 0}
                role="button"
                aria-disabled={loading}
                aria-describedby="file-help privacy-note"
                onKeyDown={onDropzoneKeyDown}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!loading) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <span className="drop-icon"><Icon name="upload" size={28} /></span>
                <span className="drop-text">
                  <strong>{file ? file.name : "Drop a 23andMe raw .txt file"}</strong>
                  <span id="file-help">{file ? "Ready for private analysis" : "or press Enter to choose one from this device"}</span>
                </span>
                <span className="file-action">{file ? "Change" : "Browse"}</span>
                <input
                  ref={inputRef}
                  className="visually-hidden"
                  type="file"
                  accept=".txt,text/plain"
                  disabled={loading}
                  onChange={(event) => pickFile(event.target.files?.[0])}
                />
              </label>

              {fileError && <p className="error" role="alert">{fileError}</p>}

              <div className="population-field">
                <label htmlFor="population-label">Broad result label <span>(optional and user-supplied)</span></label>
                <input
                  id="population-label"
                  type="text"
                  value={populationLabel}
                  disabled={loading}
                  maxLength={120}
                  autoComplete="off"
                  aria-describedby="population-help"
                  placeholder="For example: Broadly South Asian"
                  onChange={(event) => setPopulationLabel(event.target.value)}
                />
                <p id="population-help">Copy an existing broad label for research context. The app does not infer or verify ancestry from DNA.</p>
              </div>

              <button className="primary-button analyze-button" type="submit" disabled={!file || loading}>
                {loading ? <><span className="spinner" aria-hidden="true" /> Analyzing securely…</> : <>Build my evidence report <span aria-hidden="true">→</span></>}
              </button>
              <p className="privacy" id="privacy-note"><Icon name="shield" size={16} /> No health prediction · no exact ethnicity · no raw-genome response</p>
            </form>

            <aside className="analysis-sequence" aria-label="What happens after upload">
              <p className="inspector-label">Inside the audit</p>
              <ol>
                <li><span>01</span><div><strong>Validate</strong><p>Verify the vendor, build, rows, and no-calls.</p></div></li>
                <li><span>02</span><div><strong>Minimize</strong><p>Retain only the reviewed, non-medical allowlist.</p></div></li>
                <li><span>03</span><div><strong>Contextualize</strong><p>Pair every result with evidence and transfer limits.</p></div></li>
                <li><span>04</span><div><strong>Ask</strong><p>Send only the safe report fields to Gradient AI.</p></div></li>
              </ol>
              <div className={result?.data ? "analysis-state complete" : result?.error ? "analysis-state failed" : "analysis-state"}>
                <span />
                <div><small>Report state</small><strong>{result?.data ? "Ready to explore" : result?.error ? "Needs attention" : loading ? "Processing locally" : "Waiting for a file"}</strong></div>
              </div>
            </aside>
          </div>
        </section>

        <TraitNetwork reportData={result?.data} />
        <AncestryGlobe populationLabel={result?.submittedPopulationLabel || populationLabel.trim()} />
        <ResearchWorkspace reportData={result?.data} />

        <section
          className="product-surface report-surface"
          id="report"
          aria-live="polite"
          aria-labelledby="result-heading"
          ref={resultRef}
          tabIndex={-1}
        >
          <div className="surface-heading wide-heading">
            <div><p className="section-kicker">04 · Evidence report</p><h2 id="result-heading">The readable record behind the visuals.</h2></div>
            <span className={`surface-badge ${result?.data ? "ready-badge" : ""}`}>{result?.data ? "Analysis ready" : "Awaiting analysis"}</span>
          </div>
          {!result && (
            <div className="report-preview-new">
              <p><span>Coverage</span><strong>What the chip measured</strong><small>File format, build, call rate, and missing rows.</small></p>
              <p><span>Traits</span><strong>Six non-medical lenses</strong><small>Interpretations remain paired with evidence limits.</small></p>
              <p><span>Boundaries</span><strong>Refusals you can see</strong><small>No diagnosis, exact ethnicity, or unsupported certainty.</small></p>
            </div>
          )}
          {result?.error && (
            <div className="error-panel" role="alert">
              <strong>We could not complete the analysis.</strong>
              <p>{result.error}</p>
              <button className="secondary-button" type="button" onClick={() => inputRef.current?.click()}>Choose another file</button>
            </div>
          )}
          {result?.data && <Results data={result.data} submittedPopulationLabel={result.submittedPopulationLabel} />}
        </section>

        <div className="reference-panel-wrap"><ReferencePanelChart /></div>

        <footer className="site-footer">
          <a className="brand-lockup" href="#overview"><span className="brand-glyph small"><i /><i /><i /></span><span>Ancestry <strong>Audit</strong></span></a>
          <p>Interpretation and transparency for consumer DNA results. Built for AI for Social Good with DigitalOcean.</p>
          <div><a href="#analyze">Analyze</a><a href="#compare">Compare</a><a href="#atlas">Atlas</a><a href="#research">Research</a></div>
        </footer>
      </main>
    </div>
  );
}

function EvidenceAtlasRoadmap() {
  return (
    <section className="card atlas-roadmap" aria-labelledby="atlas-roadmap-heading">
      <div className="section-heading atlas-heading">
        <div><p className="step-label">Visualization roadmap</p><h2 id="atlas-roadmap-heading">Build an evidence atlas—not a person map</h2></div>
        <span className="state-pill waiting">Planned</span>
      </div>
      <p className="section-intro">
        The next visual layer should show cited, aggregate research coverage. It must never plot a person,
        derive their location, or turn a broad research label into identity.
      </p>
      <div className="atlas-grid">
        <article><span className="atlas-icon"><Icon name="map" size={22} /></span><h3>2D coverage atlas</h3><p>Region-level evidence availability with source, date, denominator, and a keyboard-accessible table.</p></article>
        <article><span className="atlas-icon"><Icon name="layers" size={22} /></span><h3>3D evidence landscape</h3><p>Optional read-only layers for reference-panel size, validation breadth, and citation depth—not genetic clustering.</p></article>
        <article><span className="atlas-number">03</span><h3>Plain-language fallback</h3><p>Every visual needs a sortable data view, a concise takeaway, and a visible explanation of what it cannot show.</p></article>
      </div>
      <p className="atlas-note">The full build brief and implementation prompt are documented with this project for the next implementation phase.</p>
    </section>
  );
}

function ReferencePanelChart() {
  const [comparisonId, setComparisonId] = useState("");
  const maximum = Math.max(...TOPMED_PANEL.groups.map((group) => group.count));
  const comparison = TOPMED_PANEL.groups.find((group) => group.id === comparisonId);
  const formatCount = new Intl.NumberFormat("en-US");
  const formatPercent = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <section className="card evidence-card" id="evidence" aria-labelledby="panel-chart-heading">
      <p className="step-label">Why specificity changes</p>
      <h2 id="panel-chart-heading">One reference panel, unequal representation</h2>
      <p className="section-intro">
        These are published analytical-assignment counts from the same {TOPMED_PANEL.name} denominator of{" "}
        <strong>{formatCount.format(TOPMED_PANEL.total)}</strong>. They show who was available for
        comparison—not anyone's ancestry percentage.
      </p>
      <p className="chart-methodology">{TOPMED_PANEL.methodology}</p>

      <div className="chart-control">
        <label htmlFor="comparison-group">Optionally highlight one published comparison label</label>
        <select
          id="comparison-group"
          value={comparisonId}
          onChange={(event) => setComparisonId(event.target.value)}
        >
          <option value="">No comparison highlight</option>
          {TOPMED_PANEL.groups
            .filter((group) => !["european", "unassigned"].includes(group.id))
            .map((group) => (
              <option value={group.id} key={group.id}>
                {group.label}
              </option>
            ))}
        </select>
      </div>

      <figure className="bar-chart" aria-describedby="chart-caveat">
        <figcaption className="visually-hidden">
          Linear bar chart comparing published TOPMed r2 reference sample counts by population label.
        </figcaption>
        <ul className="bar-list">
          {TOPMED_PANEL.groups.map((group) => {
            const percent = (group.count / TOPMED_PANEL.total) * 100;
            const isHighlighted = group.id === comparisonId;
            return (
              <li className={isHighlighted ? "bar-row highlighted" : "bar-row"} key={group.id}>
                <div className="bar-heading">
                  <span>{group.label}</span>
                  <span>
                    {formatCount.format(group.count)} <small>({formatPercent.format(percent)}%)</small>
                  </span>
                </div>
                <div className="bar-track" aria-hidden="true">
                  <span
                    className="bar-fill"
                    style={{ width: `${(group.count / maximum) * 100}%` }}
                  />
                </div>
                <a href={group.source} target="_blank" rel="noreferrer">
                  Source: {group.sourceLabel}
                </a>
                {group.nested && (
                  <div className="bar-nested">
                    <strong>{group.nested.label}:</strong>{" "}
                    {formatCount.format(group.nested.count)} ({formatPercent.format((group.nested.count / TOPMED_PANEL.total) * 100)}% of the full r2 denominator).{" "}
                    {group.nested.caveat}{" "}
                    <a href={group.nested.source} target="_blank" rel="noreferrer">
                      Source: {group.nested.sourceLabel}
                    </a>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </figure>

      <details className="chart-table">
        <summary>Read the reference-panel counts as a table</summary>
        <div className="chart-table-scroll">
          <table>
            <caption>Published TOPMed r2 counts by analytical assignment</caption>
            <thead><tr><th scope="col">Published label</th><th scope="col">Count</th><th scope="col">Share of denominator</th></tr></thead>
            <tbody>
              {TOPMED_PANEL.groups.map((group) => (
                <tr key={group.id}>
                  <th scope="row">{group.label}</th>
                  <td>{formatCount.format(group.count)}</td>
                  <td>{formatPercent.format((group.count / TOPMED_PANEL.total) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div className="chart-caveat" id="chart-caveat">
        <strong>Read this carefully:</strong> labels come from the cited studies and compress diverse
        communities. {comparison?.caveat || "A broad label is not a single homogeneous population."}{" "}
        Choosing a highlight does not classify your DNA.
      </div>

      <aside className="context-stat" aria-label="Historical GWAS context">
        <span>{TOPMED_PANEL.context.value}</span>
        <div>
          <p>{TOPMED_PANEL.context.label}</p>
          <small>{TOPMED_PANEL.context.caveat}</small>
          <a href={TOPMED_PANEL.context.source} target="_blank" rel="noreferrer">
            Source: {TOPMED_PANEL.context.sourceLabel}
          </a>
        </div>
      </aside>
    </section>
  );
}

function Results({ data = {}, submittedPopulationLabel = "" }) {
  const stats = isRecord(data.stats) ? data.stats : {};
  const coverage = isRecord(data.coverage) ? data.coverage : {};
  const totalRows = firstDefined(
    stats.total,
    coverage.total,
    coverage.total_rows,
    coverage.variant_count,
    coverage.snps_read,
  );

  if (Number(totalRows) === 0) {
    return (
      <div className="empty-state" role="status">
        <strong>No genotype rows were detected.</strong>
        <p>Check that this is an unmodified, tab-separated 23andMe raw-data export.</p>
      </div>
    );
  }

  return (
    <div className="report">
      <div className="success-banner" role="status">
        File parsed successfully. This report describes measured coverage and curated evidence—not
        ancestry inference, exact ethnicity, or health risk.
      </div>

      <CoverageSection data={data} stats={stats} coverage={coverage} totalRows={totalRows} />
      <TraitSection traits={data.traits} fallbackTraits={data.trait_hits} />
      <BoundarySection boundaries={data.boundaries} fallbackRefusals={data.refusals} />
      <TransparencySection
        context={data.population_context}
        transparency={data.transparency || data.reference_context}
        submittedPopulationLabel={submittedPopulationLabel}
      />
      <StudiesSection studies={data.studies || data.research_bridge} />

      {data.note && <p className="note report-note">{data.note}</p>}
    </div>
  );
}

function CoverageSection({ data, stats, coverage, totalRows }) {
  const preferredRows = [
    ["File", data.filename],
    ["Vendor", data.vendor || coverage.vendor],
    ["Chip version", data.chip_version || coverage.chip_version],
    ["Reference build", coverage.reference_build || coverage.genome_build],
    ["SNP rows read", totalRows],
    ["Called genotypes", firstDefined(stats.called, coverage.called, coverage.called_rows)],
    ["No-calls", firstDefined(stats.no_calls, coverage.no_calls, coverage.no_call_rows)],
    ["Malformed rows skipped", firstDefined(stats.malformed, coverage.malformed, coverage.malformed_rows)],
    [
      "Chromosomes observed",
      coverage.chromosome_counts ||
        coverage.observed_chromosomes ||
        coverage.chromosomes_observed ||
        coverage.chromosomes,
    ],
  ];
  const rows = preferredRows.filter(([, value]) => hasDisplayValue(value));

  return (
    <ReportSection id="coverage-heading" eyebrow="Parsing & coverage" title="What the file measured">
      <p className="report-intro">
        Coverage describes which rows were present in this consumer genotyping file. It is not a
        measure of ancestry, identity, or overall genome quality.
      </p>
      {rows.length ? (
        <dl className="stats-list report-stats">
          {rows.map(([label, value]) => (
            <Row label={label} value={formatValue(value)} key={label} />
          ))}
        </dl>
      ) : (
        <MissingReportData>Parser metadata was not returned for this analysis.</MissingReportData>
      )}
      {coverage.note && <p className="note">{coverage.note}</p>}
    </ReportSection>
  );
}

function TraitSection({ traits, fallbackTraits }) {
  const traitEnvelope = isRecord(traits) ? traits : {};
  const items = asArray(
    Array.isArray(traits)
      ? traits
      : traitEnvelope.items || traitEnvelope.results || traitEnvelope.allowlisted || fallbackTraits,
  );
  const measuredCount = firstDefined(
    traitEnvelope.measured_count,
    items.filter((item) => traitIsMeasured(item)).length,
  );
  const interpretableCount = firstDefined(
    traitEnvelope.interpretable_count,
    items.filter((item) => traitIsInterpretable(item)).length,
  );
  const withheldCount = firstDefined(
    traitEnvelope.withheld_count,
    Number(measuredCount) - Number(interpretableCount),
  );
  const unavailableCount = firstDefined(
    traitEnvelope.unavailable_count,
    traitEnvelope.missing_count,
    items.filter((item) => !traitIsMeasured(item)).length,
  );

  return (
    <ReportSection
      id="traits-heading"
      eyebrow="Allowlisted traits"
      title="Curated, non-medical markers only"
    >
      <div className="report-summary" aria-label="Trait coverage summary">
        <span><strong>{formatValue(measuredCount)}</strong> measured</span>
        <span><strong>{formatValue(interpretableCount)}</strong> interpreted</span>
        {Number(withheldCount) > 0 && (
          <span><strong>{formatValue(withheldCount)}</strong> withheld for build/evidence safety</span>
        )}
        <span><strong>{formatValue(unavailableCount)}</strong> unavailable or no-call</span>
      </div>
      <p className="report-intro">
        A measured association is not a prediction. Each interpretation stays paired with its
        evidence limits, especially when the original study population was narrow.
      </p>
      {items.length ? (
        <div className="trait-list">
          {items.map((rawItem, index) => {
            const item = isRecord(rawItem) ? rawItem : { interpretation: String(rawItem) };
            const measured = traitIsMeasured(item);
            const interpretable = traitIsInterpretable(item);
            const citations = citationList(item);
            return (
              <article className="trait-item" key={item.rsid || item.id || `${item.name}-${index}`}>
                <div className="item-heading">
                  <div>
                    <h4>{item.name || item.title || "Allowlisted trait"}</h4>
                    {item.rsid && <p className="metadata">Marker {item.rsid}</p>}
                  </div>
                  <span className={`state-pill ${interpretable ? "ready" : measured ? "refused" : "waiting"}`}>
                    {interpretable ? "Interpreted" : measured ? "Meaning withheld" : "Not measured"}
                  </span>
                </div>
                {measured && hasDisplayValue(item.genotype) && (
                  <p className="genotype-call">
                    Genotype in file: <strong>{formatValue(item.genotype)}</strong>
                  </p>
                )}
                <div className="evidence-block">
                  <h5>Interpretation</h5>
                  <p>{item.interpretation || item.meaning || "No interpretation was returned."}</p>
                </div>
                {(item.evidence_note || item.evidence || item.population_note) && (
                  <div className="evidence-block">
                    <h5>Evidence and transfer limits</h5>
                    <p>{item.evidence_note || item.evidence || item.population_note}</p>
                  </div>
                )}
                {citations.length > 0 && (
                  <div className="source-list" aria-label={`Evidence sources for ${item.name || item.rsid || "this marker"}`}>
                    {citations.map((citation) => (
                      <a className="source-link" href={citation.url} target="_blank" rel="noreferrer" key={citation.url}>
                        {citation.label || `Open evidence source for ${item.name || item.rsid || "this marker"}`}
                      </a>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <MissingReportData>No allowlisted trait records were returned.</MissingReportData>
      )}
    </ReportSection>
  );
}

function BoundarySection({ boundaries, fallbackRefusals }) {
  const boundaryEnvelope = isRecord(boundaries) ? boundaries : {};
  const policy =
    boundaryEnvelope.policy_summary ||
    (boundaryEnvelope.policy === "default-deny"
      ? "Only the explicitly reviewed non-medical trait allowlist is interpreted; every other marker is denied by default."
      : boundaryEnvelope.policy) ||
    "Only the displayed, vetted non-medical markers may be interpreted; every other marker is denied by default.";
  const honesty = asArray(
    Array.isArray(boundaries)
      ? boundaries
      : boundaryEnvelope.honesty || boundaryEnvelope.limitations,
  );
  const requestedChecks = asArray(
    boundaryEnvelope.requested_checks || boundaryEnvelope.refusals || fallbackRefusals,
  );
  const displayedHonesty = honesty.length ? honesty : DEFAULT_HONESTY_BOUNDARIES;

  return (
    <ReportSection id="boundaries-heading" eyebrow="Safety boundary" title="What this report refuses to conclude">
      <div className="policy-banner">
        <strong>Policy applied:</strong> {policy}
      </div>
      <div className="boundary-list">
        {displayedHonesty.map((rawItem, index) => {
          const item = normalizeBoundary(rawItem);
          return (
            <article className="boundary-item" key={item.category || item.title || index}>
              <div className="item-heading compact">
                <h4>{item.title}</h4>
                <span className="state-pill refused">Boundary</span>
              </div>
              <p>{item.response}</p>
              {item.nextStep && <p className="boundary-next-step"><strong>Safer next step:</strong> {item.nextStep}</p>}
              {item.citation?.url && (
                <a className="source-link" href={item.citation.url} target="_blank" rel="noreferrer">
                  {item.citation.label || "Open boundary evidence source"}
                </a>
              )}
            </article>
          );
        })}
      </div>

      {requestedChecks.length > 0 && (
        <div className="requested-checks">
          <h4>Default-deny checks returned with this report</h4>
          <ul>
            {requestedChecks.map((rawCheck, index) => {
              const check = normalizeRequestedCheck(rawCheck);
              return (
                <li className={check.allowed ? "allowed-check" : "refused-check"} key={check.id || index}>
                  <strong>{check.title}:</strong> {check.response}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </ReportSection>
  );
}

function TransparencySection({ context, transparency, submittedPopulationLabel }) {
  const population = isRecord(context) ? context : {};
  const explanation = isRecord(transparency) ? transparency : {};
  const originalLabel =
    population.original_label || population.population_label || submittedPopulationLabel;
  const displayLabel = population.display_label || population.canonical_label;
  const recognized = population.recognized;
  const populationCaveat =
    explanation.population_note || population.caveat || asArray(population.caveats).join(" ");

  return (
    <ReportSection
      id="transparency-heading"
      eyebrow="Reference-panel context"
      title={explanation.headline || "Why confidence and specificity can change"}
    >
      <div className="population-context">
        <div>
          <p className="context-label">User-supplied context</p>
          <p className="context-value">{originalLabel || "No broad population label supplied"}</p>
        </div>
        <span className={`state-pill ${recognized === true ? "ready" : "waiting"}`}>
          {recognized === true ? "Broad match" : originalLabel ? "General context" : "Not supplied"}
        </span>
      </div>
      {displayLabel && displayLabel !== originalLabel && (
        <p className="normalization-note">
          Matched context group: <strong>{displayLabel}</strong>. This organizes explanatory sources;
          it does not classify the uploaded DNA.
        </p>
      )}
      <p className="transparency-copy">
        {explanation.explanation ||
          "Consumer results depend on who is represented in comparison datasets. Smaller or less diverse panels can produce broader labels and less stable detail."}
      </p>
      {populationCaveat && (
        <div className="context-caveat">
          <strong>Population-specific caveat:</strong> {populationCaveat}
        </div>
      )}
      {!originalLabel && (
        <p className="note">
          General transparency guidance is shown because no existing result label was copied into
          the optional field. The app did not infer one.
        </p>
      )}
    </ReportSection>
  );
}

function StudiesSection({ studies }) {
  const studyEnvelope = isRecord(studies) ? studies : {};
  const items = asArray(
    Array.isArray(studies)
      ? studies
      : studyEnvelope.items || studyEnvelope.matches || studyEnvelope.programs,
  );
  const curatedAsOf = studyEnvelope.curated_as_of || studyEnvelope.checked_at;

  return (
    <ReportSection id="studies-heading" eyebrow="Research bridge" title="Dated programs to verify">
      <div className="section-heading studies-heading">
        <p className="report-intro">
          These matches are starting points, not endorsements or proof of eligibility. Use the
          official pages and read the current consent terms before sharing personal information.
        </p>
        {curatedAsOf && <span className="date-pill">Curated {formatDate(curatedAsOf)}</span>}
      </div>
      {studyEnvelope.disclaimer && <p className="study-disclaimer">{studyEnvelope.disclaimer}</p>}
      {items.length ? (
        <div className="study-list">
          {items.map((rawStudy, index) => {
            const study = isRecord(rawStudy) ? rawStudy : { name: String(rawStudy) };
            return (
              <article className="study-item" key={study.id || study.name || index}>
                <div className="item-heading">
                  <div>
                    <h4>{study.name || "Research program"}</h4>
                    {study.consortium && <p className="metadata">{study.consortium}</p>}
                  </div>
                  {typeof study.direct_enrollment === "boolean" && (
                    <span className={`state-pill ${study.direct_enrollment ? "ready" : "waiting"}`}>
                      {study.direct_enrollment ? "Public pathway" : "Research pathway"}
                    </span>
                  )}
                </div>
                {study.population_focus && <p>{study.population_focus}</p>}
                <StudyDetail label="Current status" value={study.recruitment_status || study.status} />
                <StudyDetail label="What participation may involve" value={study.participation} />
                <StudyDetail label="Consent and privacy" value={study.consent_privacy || study.privacy} />
                {study.status_checked && (
                  <p className="status-date">Status checked {formatDate(study.status_checked)}</p>
                )}
                <div className="study-links">
                  {isExternalUrl(study.url) && (
                    <a href={study.url} target="_blank" rel="noreferrer">Official program page</a>
                  )}
                  {isExternalUrl(study.status_source) && (
                    <a href={study.status_source} target="_blank" rel="noreferrer">Official status/privacy source</a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <MissingReportData>
          No matched study records were returned. This does not mean relevant research does not exist.
        </MissingReportData>
      )}
    </ReportSection>
  );
}

function ReportSection({ id, eyebrow, title, children }) {
  return (
    <section className="report-section" aria-labelledby={id}>
      <p className="step-label">{eyebrow}</p>
      <h3 id={id}>{title}</h3>
      {children}
    </section>
  );
}

function MissingReportData({ children }) {
  return <p className="report-empty">{children}</p>;
}

function StudyDetail({ label, value }) {
  if (!hasDisplayValue(value)) return null;
  return (
    <div className="study-detail">
      <h5>{label}</h5>
      <p>{formatValue(value)}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="stat-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

const DEFAULT_HONESTY_BOUNDARIES = [
  {
    category: "ancestry-inference",
    title: "No ancestry re-inference",
    response: "The uploaded genotypes are not used to generate or verify an ancestry label.",
  },
  {
    category: "exact-ethnicity",
    title: "No exact ethnicity claim",
    response: "Genetic similarity cannot establish a person's exact ethnicity, culture, or community identity.",
  },
  {
    category: "health-risk",
    title: "No health or disease interpretation",
    response: "Clinical and health-risk variants are outside this app's allowlist and are refused by default.",
  },
];

function normalizeBoundary(rawItem) {
  if (!isRecord(rawItem)) {
    return { title: "Protected conclusion", response: String(rawItem || "Refused by design.") };
  }
  const category = rawItem.category || rawItem.id || rawItem.rsid;
  const title = rawItem.title || rawItem.name || rawItem.request || category || "Protected conclusion";
  const response =
    rawItem.response || rawItem.reason || rawItem.message || rawItem.explanation || "Refused by design.";
  return {
    category,
    title,
    response,
    nextStep: rawItem.next_step || rawItem.nextStep,
    citation: citationDetails(rawItem.citation || rawItem.source),
  };
}

function normalizeRequestedCheck(rawItem) {
  if (!isRecord(rawItem)) {
    return {
      id: String(rawItem),
      title: "Requested marker",
      response: String(rawItem || "The marker request could not be evaluated."),
      allowed: false,
    };
  }
  const marker = rawItem.rsid || rawItem.id || "Requested marker";
  const allowed = rawItem.allowed === true && rawItem.refused !== true;
  return {
    id: marker,
    title: marker,
    allowed,
    response: allowed
      ? "Allowed by policy; any available interpretation appears in the trait section above."
      : rawItem.reason || rawItem.message || "Outside the allowlist and refused without interpretation.",
  };
}

function traitIsMeasured(item) {
  if (!isRecord(item)) return false;
  if (typeof item.measured === "boolean") return item.measured;
  if (typeof item.available === "boolean") return item.available;
  if (typeof item.status === "string") return item.status.toLowerCase() === "measured";
  return hasDisplayValue(item.genotype);
}

function traitIsInterpretable(item) {
  if (!isRecord(item)) return false;
  if (typeof item.interpretable === "boolean") return item.interpretable;
  return traitIsMeasured(item);
}

function citationList(item) {
  if (!isRecord(item)) return [];
  const candidates = [item.citation || item.source, ...asArray(item.citations)];
  const seen = new Set();
  return candidates
    .map((citation) => citationDetails(citation))
    .filter((citation) => citation.url && !seen.has(citation.url) && seen.add(citation.url));
}

function citationDetails(citation) {
  if (typeof citation === "string") {
    return isExternalUrl(citation) ? { url: citation, label: "Open evidence source" } : {};
  }
  if (!isRecord(citation)) return {};
  const url = citation.url || citation.href;
  return isExternalUrl(url)
    ? { url, label: citation.label || citation.title || citation.name }
    : {};
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function hasDisplayValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function formatValue(value) {
  if (typeof value === "number") return new Intl.NumberFormat("en-US").format(value);
  if (Array.isArray(value)) return value.join(", ");
  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, item]) => `${key.replaceAll("_", " ")}: ${item}`)
      .join(", ");
  }
  return String(value);
}

function formatDate(value) {
  const text = String(value);
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00Z` : text);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function isExternalUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function QuestionGuide({ analysisReady, selected, onSelect, reportData }) {
  const active = ANSWER_CATEGORIES.find((category) => category.id === selected);
  const [narratives, setNarratives] = useState({});
  const lastReportRef = useRef(reportData);

  useEffect(() => {
    if (lastReportRef.current !== reportData) {
      lastReportRef.current = reportData;
      setNarratives({});
    }
  }, [reportData]);

  async function fetchNarrative(categoryId) {
    setNarratives((prev) => ({ ...prev, [categoryId]: { status: "loading" } }));
    try {
      const response = await fetch("/api/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: categoryId, report: reportData }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNarratives((prev) => ({
          ...prev,
          [categoryId]: { status: "error", error: data.error || `Request failed (HTTP ${response.status}).` },
        }));
        return;
      }
      setNarratives((prev) => ({
        ...prev,
        [categoryId]: { status: "ready", content: data.content, citations: data.citations || [] },
      }));
    } catch {
      setNarratives((prev) => ({
        ...prev,
        [categoryId]: { status: "error", error: "We could not reach the AI explanation service." },
      }));
    }
  }

  const activeNarrative = active ? narratives[active.id] : null;

  return (
    <section className="card" id="questions" aria-labelledby="questions-heading">
      <div className="section-heading">
        <div>
          <p className="step-label">Explore by question</p>
          <h2 id="questions-heading">Six ways to audit a result</h2>
        </div>
        <span className={`state-pill ${analysisReady ? "ready" : "waiting"}`}>
          {analysisReady ? "Analysis ready" : "Analyze first"}
        </span>
      </div>
      <p className="section-intro">
        Choose a category to see the kind of question this audit layer can answer responsibly.
      </p>
      <div className="category-grid">
        {ANSWER_CATEGORIES.map((category) => (
          <button
            className="category-button"
            type="button"
            key={category.id}
            aria-pressed={selected === category.id}
            aria-controls="question-detail"
            onClick={() => onSelect(category.id)}
          >
            <span className="category-title">{category.title}</span>
            <span>{category.description}</span>
          </button>
        ))}
      </div>
      <div className="question-detail" id="question-detail" aria-live="polite">
        {active ? (
          <>
            <p className="question-label">Suggested question</p>
            <p className="suggested-question">“{active.question}”</p>
            <p className="detail-note">
              {analysisReady
                ? "Use this lens when reviewing the guided result; answers must stay within the cited evidence."
                : "Analyze a file first so the question can be grounded in measured coverage and broad context."}
            </p>

            {analysisReady && (
              <div className="narrative-block">
                {(!activeNarrative || activeNarrative.status === "error") && (
                  <button className="secondary-button" type="button" onClick={() => fetchNarrative(active.id)}>
                    Get a Gradient AI cited answer
                  </button>
                )}
                {activeNarrative?.status === "loading" && (
                  <p className="loading-message" role="status" aria-live="polite">
                    <span className="spinner" aria-hidden="true" /> Asking Gradient AI…
                  </p>
                )}
                {activeNarrative?.status === "error" && (
                  <p className="error" role="alert">
                    {activeNarrative.error}
                  </p>
                )}
                {activeNarrative?.status === "ready" && (
                  <div className="narrative-answer">
                    <p>{activeNarrative.content}</p>
                    {activeNarrative.citations.length > 0 && (
                      <div className="source-list" aria-label="AI answer sources">
                        {activeNarrative.citations.map((citation) => (
                          <a
                            className="source-link"
                            href={citation.url}
                            target="_blank"
                            rel="noreferrer"
                            key={citation.url}
                          >
                            {citation.label || "Open source"}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="empty-state">No category selected. Use any card above to reveal a suggested question.</p>
        )}
      </div>
    </section>
  );
}
