import assert from "node:assert/strict";
import test from "node:test";
import { applyVideoQuality, isCloudinaryVideoUrl } from "./video-quality.mjs";

const CLOUDINARY_URL =
  "https://res.cloudinary.com/demo/video/upload/v1700000000/clip.mp4";

test("isCloudinaryVideoUrl detects cloudinary video delivery urls", () => {
  assert.equal(isCloudinaryVideoUrl(CLOUDINARY_URL), true);
  assert.equal(isCloudinaryVideoUrl("https://example.com/clip.mp4"), false);
  assert.equal(isCloudinaryVideoUrl(undefined), false);
});

test("applyVideoQuality inserts the quality transform after /video/upload/", () => {
  assert.equal(
    applyVideoQuality(CLOUDINARY_URL, "low"),
    "https://res.cloudinary.com/demo/video/upload/q_auto:low/v1700000000/clip.mp4"
  );
  assert.equal(
    applyVideoQuality(CLOUDINARY_URL, "high"),
    "https://res.cloudinary.com/demo/video/upload/q_auto:best/v1700000000/clip.mp4"
  );
});

test("applyVideoQuality replaces an existing quality transform instead of stacking", () => {
  const alreadyLow = "https://res.cloudinary.com/demo/video/upload/q_auto:low/v1/clip.mp4";
  assert.equal(
    applyVideoQuality(alreadyLow, "high"),
    "https://res.cloudinary.com/demo/video/upload/q_auto:best/v1/clip.mp4"
  );
});

test("applyVideoQuality leaves non-cloudinary urls unchanged", () => {
  const url = "https://example.com/clip.mp4";
  assert.equal(applyVideoQuality(url, "low"), url);
});
