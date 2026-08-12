import test from "node:test";
import assert from "node:assert/strict";

import { BUTTON_BOX_SHADOW, BUTTON_SHADOW_VARS } from "./button-shadow.mjs";

test("button shadow constant matches the floating action design token", () => {
  assert.equal(
    BUTTON_BOX_SHADOW,
    "rgba(0, 0, 0, 0.4) 0px 2px 4px, rgba(0, 0, 0, 0.3) 0px 7px 13px -3px, rgba(0, 0, 0, 0.2) 0px -3px 0px inset"
  );
});

test("button shadow vars expose the shared css custom property", () => {
  assert.deepEqual(BUTTON_SHADOW_VARS, {
    "--button-shadow":
      "rgba(0, 0, 0, 0.4) 0px 2px 4px, rgba(0, 0, 0, 0.3) 0px 7px 13px -3px, rgba(0, 0, 0, 0.2) 0px -3px 0px inset",
  });
});
