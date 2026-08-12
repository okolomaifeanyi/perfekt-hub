import assert from "node:assert/strict";
import test from "node:test";
import { canUsePrivateData } from "./private-data-access.mjs";

test("canUsePrivateData requires auth readiness and a user uid", () => {
  assert.equal(canUsePrivateData(false, "user-1"), false);
  assert.equal(canUsePrivateData(true, null), false);
  assert.equal(canUsePrivateData(true, ""), false);
  assert.equal(canUsePrivateData(true, "user-1"), true);
});
