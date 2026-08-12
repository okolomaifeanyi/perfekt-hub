import test from "node:test";
import assert from "node:assert/strict";

import { INPUT_BOX_SHADOW_CLASS } from "./input-shadow.mjs";
import { TEXTAREA_BASE_CLASS } from "./textarea-style.mjs";

test("textarea base class keeps flex items shrinkable", () => {
  assert.match(TEXTAREA_BASE_CLASS, /\bmin-w-0\b/);
  assert.doesNotMatch(TEXTAREA_BASE_CLASS, /\bfield-sizing-content\b/);
});

test("textarea base class uses the shared inset input shadow", () => {
  assert.ok(TEXTAREA_BASE_CLASS.includes(INPUT_BOX_SHADOW_CLASS));
});
