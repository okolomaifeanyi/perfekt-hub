import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_SANS_FONT_NAME,
  APP_SANS_FONT_VARIABLE,
} from "./font-config.mjs";

test("app font config uses Plus Jakarta Sans", () => {
  assert.equal(APP_SANS_FONT_NAME, "Plus Jakarta Sans");
  assert.equal(APP_SANS_FONT_VARIABLE, "--font-plus-jakarta-sans");
});
