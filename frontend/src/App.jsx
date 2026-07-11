import { useEffect, useRef, useState } from "react";

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

export default function App() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { data } | { error }
  const [fileError, setFileError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const inputRef = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => {
    if (result && resultRef.current) resultRef.current.focus();
  }, [result]);

  function pickFile(candidate) {
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
    pickFile(event.dataTransfer.files?.[0]);
  }

  function onDropzoneKeyDown(event) {
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

    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch("/api/analyze", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      setResult(
        response.ok
          ? { data }
          : { error: data.error || `Analysis failed (HTTP ${response.status}). Try again.` },
      );
    } catch {
      setResult({ error: "We could not reach the analysis service. Check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }

  const hasAnalysis = Boolean(result?.data);

  return (
    <main className="wrap">
      <header>
        <p className="eyebrow">DNA literacy &amp; equity</p>
        <h1>Ancestry Audit Layer</h1>
        <p className="lede">
          Upload a 23andMe raw file. We explain what it actually tells you—and{" "}
          <strong>why the answer gets vague when reference panels leave people out.</strong>{" "}
          We interpret existing results; we do not infer ancestry or health risk.
        </p>
      </header>

      <section className="card" aria-labelledby="upload-heading" aria-busy={loading}>
        <h2 id="upload-heading">1. Analyze your raw-data file</h2>
        <form onSubmit={onSubmit}>
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
            <span className="drop-icon" aria-hidden="true">
              &#8613;
            </span>
            <span className="drop-text">
              <strong>Drop a 23andMe raw .txt file</strong>
              <span id="file-help">or press Enter to choose one</span>
            </span>
            <input
              ref={inputRef}
              className="visually-hidden"
              type="file"
              accept=".txt,text/plain"
              disabled={loading}
              onChange={(event) => pickFile(event.target.files?.[0])}
            />
          </label>

          {file ? (
            <div className="file-row">
              <p className="filename">
                <span aria-hidden="true">&#10003;</span> Selected: <strong>{file.name}</strong>
              </p>
              <button
                className="text-button"
                type="button"
                disabled={loading}
                onClick={() => inputRef.current?.click()}
              >
                Change file
              </button>
            </div>
          ) : (
            <p className="empty-inline">No file selected yet.</p>
          )}

          {fileError && (
            <p className="error" role="alert">
              {fileError}
            </p>
          )}

          <button className="primary-button" type="submit" disabled={!file || loading}>
            {loading ? "Analyzing securely…" : "Analyze file"}
          </button>

          {loading && (
            <p className="loading-message" role="status" aria-live="polite">
              <span className="spinner" aria-hidden="true" /> Reading variants in memory. Larger files may
              take a moment.
            </p>
          )}
        </form>
        <p className="privacy" id="privacy-note">
          <span aria-hidden="true">&#128274;</span> Your file is processed in memory and never stored.
        </p>
      </section>

      {!result && !loading && (
        <section className="card status-card" aria-labelledby="result-empty-heading">
          <h2 id="result-empty-heading">2. Guided result</h2>
          <p className="empty-state">No analysis yet. Choose a file above to begin.</p>
        </section>
      )}

      {result && (
        <section
          className="card"
          aria-live="polite"
          aria-labelledby="result-heading"
          ref={resultRef}
          tabIndex={-1}
        >
          <h2 id="result-heading">2. Guided result</h2>
          {result.error ? (
            <div className="error-panel" role="alert">
              <strong>We could not complete the analysis.</strong>
              <p>{result.error}</p>
              <button className="secondary-button" type="button" onClick={() => inputRef.current?.click()}>
                Choose another file
              </button>
            </div>
          ) : (
            <Results data={result.data} />
          )}
        </section>
      )}

      <QuestionGuide
        analysisReady={hasAnalysis}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />
    </main>
  );
}

function Results({ data }) {
  const stats = data.stats || {};
  if (!stats.total) {
    return (
      <div className="empty-state" role="status">
        <strong>No genotype rows were detected.</strong>
        <p>Check that this is an unmodified, tab-separated 23andMe raw-data export.</p>
      </div>
    );
  }
  return (
    <div>
      <div className="success-banner" role="status">
        File parsed successfully. This confirms format and coverage only—not ancestry or health.
      </div>
      <dl className="stats-list">
        <Row label="File" value={data.filename ?? "Not provided"} />
        <Row label="Vendor" value={data.vendor ?? "Unknown"} />
        <Row label="SNPs read" value={stats.total ?? 0} />
        <Row label="No-calls" value={stats.no_calls ?? 0} />
      </dl>
      {data.note && <p className="note">{data.note}</p>}
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

function QuestionGuide({ analysisReady, selected, onSelect }) {
  const active = ANSWER_CATEGORIES.find((category) => category.id === selected);
  return (
    <section className="card" aria-labelledby="questions-heading">
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
          </>
        ) : (
          <p className="empty-state">No category selected. Use any card above to reveal a suggested question.</p>
        )}
      </div>
    </section>
  );
}
