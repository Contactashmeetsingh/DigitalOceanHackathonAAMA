import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiError,
  NARRATIVE_CATEGORIES,
  requestNarrative,
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

test("unsafe citation protocols are rejected", () => {
  assert.equal(safeExternalUrl("javascript:alert(1)"), null);
  assert.equal(safeExternalUrl("not a url"), null);
  assert.equal(safeExternalUrl("https://example.org/paper"), "https://example.org/paper");
});
