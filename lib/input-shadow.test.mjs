import test from "node:test";
import assert from "node:assert/strict";

import { INPUT_BOX_SHADOW_CLASS } from "./input-shadow.mjs";

test("input shadow class matches the requested inset shadow", () => {
  assert.equal(
    INPUT_BOX_SHADOW_CLASS,
    "shadow-[rgba(0,0,0,0.06)_0px_2px_4px_0px_inset]"
  );
});
