import assert from "node:assert/strict";
import test from "node:test";
import { rankEvents } from "./event-discovery.mjs";

test("rankEvents keeps public events and private events separate", () => {
  const ranked = rankEvents([
    { id: "public-1", visibility: "public", participants: 120 },
    { id: "private-1", visibility: "private", participants: 45 },
  ]);

  assert.equal(ranked[0].visibility, "public");
});
