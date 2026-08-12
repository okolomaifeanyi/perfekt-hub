import test from "node:test";
import assert from "node:assert/strict";

import { CARD_BOX_SHADOW, CARD_SHADOW_STYLE } from "./card-shadow.mjs";

test("card shadow constant matches the design token", () => {
  assert.equal(
    CARD_BOX_SHADOW,
    "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px"
  );
});

test("card shadow style exposes the shared box shadow", () => {
  assert.deepEqual(CARD_SHADOW_STYLE, {
    boxShadow:
      "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
  });
});
