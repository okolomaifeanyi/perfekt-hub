import assert from "node:assert/strict";
import test from "node:test";

import { isPublicPath } from "./public-routes.mjs";

test("isPublicPath allows the home feed, discover, and updates", () => {
  assert.equal(isPublicPath("/"), true);
  assert.equal(isPublicPath("/discover"), true);
  assert.equal(isPublicPath("/updates"), true);
});

test("isPublicPath allows a post detail page", () => {
  assert.equal(
    isPublicPath("/ifeanyiokoloma/83a2a360-7026-4791-be8d-4c4c470999b1"),
    true
  );
});

test("isPublicPath rejects other two-segment username routes", () => {
  assert.equal(isPublicPath("/ifeanyiokoloma/followers"), false);
  assert.equal(isPublicPath("/ifeanyiokoloma/videos"), false);
  assert.equal(isPublicPath("/settings/account"), false);
  assert.equal(isPublicPath("/discover/events"), false);
});

test("isPublicPath rejects gated routes", () => {
  assert.equal(isPublicPath("/messages"), false);
  assert.equal(isPublicPath("/notifications"), false);
  assert.equal(isPublicPath("/assistant"), false);
  assert.equal(isPublicPath(""), false);
  assert.equal(isPublicPath(undefined), false);
});
