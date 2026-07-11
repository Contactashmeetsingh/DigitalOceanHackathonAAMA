export const NARRATIVE_CATEGORIES = [
  {
    id: "interpretation",
    label: "Interpretation",
    eyebrow: "Read the result",
    question: "What does my broad ancestry result actually say—and what does it not say?",
  },
  {
    id: "reference-panels",
    label: "Reference panels",
    eyebrow: "Audit confidence",
    question: "Why is this result less specific for some populations?",
  },
  {
    id: "history",
    label: "Population history",
    eyebrow: "Add context",
    question: "What population history can explain overlap in broad regional results?",
  },
  {
    id: "traits",
    label: "Trait evidence",
    eyebrow: "Check the science",
    question: "How strong is the evidence for this non-medical trait in people like me?",
  },
  {
    id: "research",
    label: "Research bridge",
    eyebrow: "Find programs",
    question: "Which research programs are improving representation for my broad population?",
  },
  {
    id: "limits",
    label: "Honest limits",
    eyebrow: "Hold the boundary",
    question: "What can this app not responsibly conclude from my file?",
  },
];

export class ApiError extends Error {
  constructor(message, { status = 0, code = "request_failed", details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function jsonRequest(path, options, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(path, options);
  } catch (error) {
    throw new ApiError("We could not reach the analysis service. Check your connection and try again.", {
      code: "network_error",
      details: error instanceof Error ? error.message : undefined,
    });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      typeof payload.error === "string"
        ? payload.error
        : `The request failed (HTTP ${response.status}). Try again.`,
      {
        status: response.status,
        code: typeof payload.code === "string" ? payload.code : "request_failed",
        details: payload.details,
      },
    );
  }
  return payload;
}

export function analyzeGenome({ file, populationLabel = "", signal, fetchImpl = globalThis.fetch }) {
  if (!file) {
    return Promise.reject(new ApiError("Choose a 23andMe raw-data file before analyzing.", {
      code: "missing_file",
    }));
  }

  const body = new FormData();
  body.append("file", file);
  body.append("population_label", populationLabel.trim());

  return jsonRequest("/api/analyze", { method: "POST", body, signal }, fetchImpl);
}

export function requestNarrative({ category, report, signal, fetchImpl = globalThis.fetch }) {
  const allowed = NARRATIVE_CATEGORIES.some((item) => item.id === category);
  if (!allowed) {
    return Promise.reject(new ApiError("Choose one of the six vetted research questions.", {
      code: "invalid_category",
    }));
  }
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    return Promise.reject(new ApiError("Analyze a file before asking a report-grounded question.", {
      code: "missing_report",
    }));
  }

  return jsonRequest(
    "/api/narrative",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, report }),
      signal,
    },
    fetchImpl,
  );
}

export function safeExternalUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
