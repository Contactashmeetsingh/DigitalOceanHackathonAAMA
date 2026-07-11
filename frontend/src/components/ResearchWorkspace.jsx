import { useEffect, useRef, useState } from "react";

import { NARRATIVE_CATEGORIES, requestNarrative, safeExternalUrl } from "../api.js";

const PREVIEW_ANSWER =
  "I’ll read only the boundary-checked report, separate measured evidence from uncertainty, and say when the available research cannot support a conclusion. Once an audit is ready, choose one of the vetted questions to ask DigitalOcean Gradient AI.";

export default function ResearchWorkspace({ reportData }) {
  const [activeId, setActiveId] = useState("interpretation");
  const [answers, setAnswers] = useState({});
  const lastReportRef = useRef(reportData);
  const active = NARRATIVE_CATEGORIES.find((category) => category.id === activeId);
  const current = answers[activeId];
  const analysisReady = Boolean(reportData);

  useEffect(() => {
    if (lastReportRef.current !== reportData) {
      lastReportRef.current = reportData;
      setAnswers({});
    }
  }, [reportData]);

  async function askQuestion(event) {
    event.preventDefault();
    if (!analysisReady || current?.status === "loading") return;
    setAnswers((previous) => ({ ...previous, [activeId]: { status: "loading" } }));
    try {
      const response = await requestNarrative({ category: activeId, report: reportData });
      const citations = Array.isArray(response.citations)
        ? response.citations
          .map((citation) => ({ ...citation, url: safeExternalUrl(citation?.url) }))
          .filter((citation) => citation.url)
        : [];
      setAnswers((previous) => ({
        ...previous,
        [activeId]: {
          status: "ready",
          content: response.content || "The service returned an empty answer.",
          citations,
        },
      }));
    } catch (error) {
      setAnswers((previous) => ({
        ...previous,
        [activeId]: {
          status: "error",
          error: error instanceof Error ? error.message : "The research service is unavailable.",
        },
      }));
    }
  }

  return (
    <section className="product-surface research-surface" id="research" aria-labelledby="research-heading">
      <div className="surface-heading wide-heading">
        <div>
          <p className="section-kicker">03 · Research agent</p>
          <h2 id="research-heading">Ask better questions of your own data.</h2>
        </div>
        <span className="gradient-badge"><i /> DigitalOcean Gradient AI</span>
      </div>
      <p className="surface-lede">
        A ChatGPT-style research room with a deliberately smaller permission set: six vetted
        questions, your safe report context, and citations when retrieval actually returns them.
      </p>

      <div className="research-window">
        <aside className="research-sidebar" aria-label="Vetted research questions">
          <div className="window-brand">
            <span className="brand-glyph small"><i /><i /><i /></span>
            <div><strong>Research room</strong><small>Boundary-aware by design</small></div>
          </div>
          <nav>
            {NARRATIVE_CATEGORIES.map((category) => (
              <button
                type="button"
                className={activeId === category.id ? "research-topic active" : "research-topic"}
                aria-pressed={activeId === category.id}
                onClick={() => setActiveId(category.id)}
                key={category.id}
              >
                <span>{category.eyebrow}</span>
                <strong>{category.label}</strong>
              </button>
            ))}
          </nav>
          <div className="research-privacy">
            <span aria-hidden="true">⌁</span>
            <p><strong>Safe context only</strong><small>The agent never receives the raw upload.</small></p>
          </div>
        </aside>

        <div className="chat-panel">
          <header className="chat-header">
            <div>
              <span className={analysisReady ? "connection-dot online" : "connection-dot"} />
              <strong>{analysisReady ? "Report connected" : "Preview mode"}</strong>
            </div>
            <span>{analysisReady ? "Ready to ask" : "Upload required for live answers"}</span>
          </header>

          <div className="chat-thread" aria-live="polite">
            <article className="message assistant-message">
              <span className="message-avatar">AA</span>
              <div>
                <p className="message-meta">Ancestry Audit research agent</p>
                <p>{PREVIEW_ANSWER}</p>
              </div>
            </article>

            {(current || active) && (
              <article className="message user-message">
                <div>
                  <p className="message-meta">Vetted question · {active.label}</p>
                  <p>{active.question}</p>
                </div>
                <span className="message-avatar user-avatar">You</span>
              </article>
            )}

            {current?.status === "loading" && (
              <article className="message assistant-message loading-answer" role="status">
                <span className="message-avatar">AA</span>
                <div>
                  <p className="message-meta">Reading your report and available research</p>
                  <span className="typing-dots" aria-label="Gradient AI is working"><i /><i /><i /></span>
                  <small>Live agent responses can take 60–90 seconds. Please keep this tab open.</small>
                </div>
              </article>
            )}

            {current?.status === "error" && (
              <article className="message assistant-message message-error" role="alert">
                <span className="message-avatar">!</span>
                <div><p className="message-meta">The answer did not complete</p><p>{current.error}</p></div>
              </article>
            )}

            {current?.status === "ready" && (
              <article className="message assistant-message answer-message">
                <span className="message-avatar">AA</span>
                <div>
                  <p className="message-meta">Grounded response</p>
                  <p className="answer-copy">{current.content}</p>
                  {current.citations.length ? (
                    <div className="citation-row" aria-label="Retrieved answer sources">
                      {current.citations.map((citation) => (
                        <a href={citation.url} target="_blank" rel="noreferrer" key={citation.url}>
                          <span aria-hidden="true">↗</span>{citation.label || "Open source"}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="citation-empty">No retrieval citations were returned for this answer.</p>
                  )}
                </div>
              </article>
            )}
          </div>

          <form className="chat-composer" onSubmit={askQuestion}>
            <label htmlFor="vetted-question">Current vetted question</label>
            <div className="composer-row">
              <textarea id="vetted-question" rows="2" value={active.question} readOnly />
              <button type="submit" disabled={!analysisReady || current?.status === "loading"}>
                <span className="visually-hidden">Ask the current vetted question</span>
                <span aria-hidden="true">↑</span>
              </button>
            </div>
            <p>
              {analysisReady
                ? "The backend chooses the canonical prompt and strips the report to approved fields."
                : "Analyze a 23andMe file above to activate report-grounded answers."}
            </p>
          </form>
        </div>
      </div>

      <div className="truth-note research-truth-note">
        <strong>Not a free-form medical chatbot.</strong>
        <span>Health risk, exact ethnicity, and unsupported identity claims remain outside the agent’s contract.</span>
      </div>
    </section>
  );
}
