import test from "node:test";
import assert from "node:assert/strict";

import { canReplaceSelectedFile } from "./uploadInteraction.js";

test("selected files cannot be replaced while an analysis is running", () => {
  assert.equal(canReplaceSelectedFile(false), true);
  assert.equal(canReplaceSelectedFile(true), false);
});
