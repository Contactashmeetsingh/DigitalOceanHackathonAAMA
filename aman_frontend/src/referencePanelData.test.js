import assert from "node:assert/strict";
import test from "node:test";

import { TOPMED_PANEL } from "./referencePanelData.js";

test("TOPMed r2 peer groups are mutually exclusive and sum to the denominator", () => {
  assert.equal(
    TOPMED_PANEL.groups.reduce((sum, group) => sum + group.count, 0),
    TOPMED_PANEL.total,
  );
  assert.deepEqual(
    TOPMED_PANEL.groups.map((group) => group.id),
    ["european", "african", "admixed-american", "east-asian", "south-asian", "unassigned"],
  );
});

test("Pakistani data is nested under South Asian rather than plotted as a peer", () => {
  const southAsian = TOPMED_PANEL.groups.find((group) => group.id === "south-asian");

  assert.equal(southAsian.count, 644);
  assert.equal(southAsian.nested.count, 139);
  assert.ok(southAsian.nested.count < southAsian.count);
  assert.ok(!TOPMED_PANEL.groups.some((group) => group.id === "pakistani"));
});

test("historical 96 percent context uses the participant unit and direct source", () => {
  assert.match(TOPMED_PANEL.context.label, /participants/i);
  assert.match(TOPMED_PANEL.context.caveat, /not a share of studies/i);
  assert.equal(TOPMED_PANEL.context.source, "https://doi.org/10.1016/j.tig.2009.09.012");
});
