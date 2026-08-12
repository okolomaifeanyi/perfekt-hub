import assert from "node:assert/strict";
import test from "node:test";
import { BODY_BACKGROUND_STYLE } from "./theme-background.mjs";

test("body background style uses theme css variables", () => {
  assert.equal(BODY_BACKGROUND_STYLE.backgroundColor, "var(--app-body-background-color)");
  assert.equal(BODY_BACKGROUND_STYLE.backgroundImage, "var(--app-body-background-image)");
  assert.equal(BODY_BACKGROUND_STYLE.backgroundAttachment, "fixed");
});
