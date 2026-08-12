import assert from "node:assert/strict";
import test from "node:test";
import {
  averageColorFromPixels,
  fallbackColorFromSrc,
} from "./image-colors.mjs";

test("averageColorFromPixels returns the mean visible color", () => {
  const pixels = new Uint8ClampedArray([
    255, 0, 0, 255,
    0, 0, 255, 255,
  ]);

  assert.equal(averageColorFromPixels(pixels), "#800080");
});

test("fallbackColorFromSrc is deterministic and hex formatted", () => {
  const first = fallbackColorFromSrc("https://example.com/image.png");
  const second = fallbackColorFromSrc("https://example.com/image.png");

  assert.equal(first, second);
  assert.match(first, /^#[0-9a-f]{6}$/i);
});
