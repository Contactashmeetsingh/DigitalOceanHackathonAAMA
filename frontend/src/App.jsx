import { useRef, useState } from "react";

export default function App() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { data } | { error }
  const inputRef = useRef(null);

  function pickFile(f) {
    if (f) setFile(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);

    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/analyze", { method: "POST", body });
      const data = await res.json();
      setResult(res.ok ? { data } : { error: data.error || "Something went wrong." });
    } catch {
      setResult({ error: "Network error — is the server running?" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      <header>
        <p className="eyebrow">DNA literacy &amp; equity</p>
        <h1>Ancestry Audit Layer</h1>
        <p className="lede">
          Upload a 23andMe raw file. We explain what it actually tells you — and{" "}
          <strong>why the answer gets vague if you're not of European descent.</strong>{" "}
          We're not an ancestry tool; we're an audit layer for ancestry tools.
        </p>
      </header>

      <section className="card">
        <form onSubmit={onSubmit}>
          <label
            className={`dropzone${dragging ? " drag" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <span className="drop-icon" aria-hidden="true">
              &#8613;
            </span>
            <span className="drop-text">
              Drop a 23andMe raw <code>.txt</code> file, or click to choose
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".txt,text/plain"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </label>

          {file && <p className="filename">Selected: {file.name}</p>}

          <button type="submit" disabled={!file || loading}>
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </form>
        <p className="privacy">&#128274; Your file is processed in memory and never stored.</p>
      </section>

      {result && (
        <section className="card" aria-live="polite">
          <h2>Result</h2>
          {result.error ? (
            <p className="error">{result.error}</p>
          ) : (
            <Results data={result.data} />
          )}
        </section>
      )}
    </main>
  );
}

function Results({ data }) {
  const s = data.stats || {};
  return (
    <div>
      <Row label="File" value={data.filename ?? "—"} />
      <Row label="Vendor" value={data.vendor ?? "—"} />
      <Row label="SNPs read" value={s.total ?? 0} />
      <Row label="No-calls" value={s.no_calls ?? 0} />
      {data.note && <p className="note">{data.note}</p>}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
