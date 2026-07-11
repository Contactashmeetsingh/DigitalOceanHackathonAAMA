import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiError,
  NARRATIVE_CATEGORIES,
  requestComparisonCohort,
  requestNarrative,
  requestPopulationMap,
  safeExternalUrl,
} from "./api.js";

test("narrative categories mirror the six server-vetted questions", () => {
  assert.deepEqual(
    NARRATIVE_CATEGORIES.map(({ id }) => id),
    ["interpretation", "reference-panels", "history", "traits", "research", "limits"],
  );
});

test("requestNarrative posts the exact same-origin contract", async () => {
  let received;
  const response = await requestNarrative({
    category: "limits",
    report: { report_version: "1" },
    fetchImpl: async (path, options) => {
      received = { path, options };
      return {
        ok: true,
        status: 200,
        json: async () => ({ category: "limits", content: "A bounded answer.", citations: [] }),
      };
    },
  });

  assert.equal(received.path, "/api/narrative");
  assert.equal(received.options.method, "POST");
  assert.deepEqual(JSON.parse(received.options.body), {
    category: "limits",
    report: { report_version: "1" },
  });
  assert.equal(response.content, "A bounded answer.");
});

test("requestNarrative preserves stable API errors", async () => {
  await assert.rejects(
    requestNarrative({
      category: "traits",
      report: {},
      fetchImpl: async () => ({
        ok: false,
        status: 502,
        json: async () => ({ error: "Narrative unavailable.", code: "narrative_unavailable" }),
      }),
    }),
    (error) => error instanceof ApiError
      && error.status === 502
      && error.code === "narrative_unavailable",
  );
});

test("visualization helpers post only the analyzed report to same-origin routes", async () => {
  const calls = [];
  const report = { report_version: "1", stats: { called: 42 } };
  const fetchImpl = async (path, options) => {
    calls.push({ path, options });
    return {
      ok: true,
      status: 200,
      json: async () => path.endsWith("comparison-cohort")
        ? { nodes: [{ id: "you" }], links: [] }
        : { populations: [], you_marker: null },
    };
  };

  await Promise.all([
    requestComparisonCohort({ report, fetchImpl }),
    requestPopulationMap({ report, fetchImpl }),
  ]);

  assert.deepEqual(calls.map(({ path }) => path), [
    "/api/comparison-cohort",
    "/api/population-map",
  ]);
  for (const { options } of calls) {
    assert.equal(options.method, "POST");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(options.body), { report });
  }
});

test("visualization helpers reject missing reports before making a request", async () => {
  let requestCount = 0;
  const fetchImpl = async () => {
    requestCount += 1;
  };

  await assert.rejects(
    requestComparisonCohort({ report: null, fetchImpl }),
    (error) => error instanceof ApiError && error.code === "missing_report",
  );
  await assert.rejects(
    requestPopulationMap({ report: [], fetchImpl }),
    (error) => error instanceof ApiError && error.code === "missing_report",
  );
  assert.equal(requestCount, 0);
});

test("visualization helpers reject malformed success payloads", async () => {
  await assert.rejects(
    requestComparisonCohort({
      report: {},
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ nodes: "not-an-array", links: [] }),
      }),
    }),
    (error) => error instanceof ApiError && error.code === "invalid_response",
  );

  await assert.rejects(
    requestPopulationMap({
      report: {},
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ populations: null }),
      }),
    }),
    (error) => error instanceof ApiError && error.code === "invalid_response",
  );
});

test("unsafe citation protocols are rejected", () => {
  assert.equal(safeExternalUrl("javascript:alert(1)"), null);
  assert.equal(safeExternalUrl("not a url"), null);
  assert.equal(safeExternalUrl("https://example.org/paper"), "https://example.org/paper");
});
