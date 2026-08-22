import assert from "node:assert/strict";
import test from "node:test";
import { isPublicPath } from "./public-routes.mjs";

test("exact public paths are allowed", () => {
  assert.equal(isPublicPath("/"), true);
  assert.equal(isPublicPath("/discover"), true);
  assert.equal(isPublicPath("/updates"), true);
  assert.equal(isPublicPath("/articles"), true);
});

test("a falsy pathname is never public", () => {
  assert.equal(isPublicPath(""), false);
  assert.equal(isPublicPath(undefined), false);
  assert.equal(isPublicPath(null), false);
});

test("a post detail page (/[username]/[uuid]) is public", () => {
  assert.equal(isPublicPath("/johndoe/3fa85f64-5717-4562-b3fc-2c963f66afa6"), true);
});

test("other two-segment username routes are not treated as post detail pages", () => {
  assert.equal(isPublicPath("/johndoe/followers"), false);
  assert.equal(isPublicPath("/johndoe/videos"), false);
});

test("an article detail page (/articles/[username]/[slug]) is public", () => {
  assert.equal(isPublicPath("/articles/johndoe/how-to-build-a-social-app"), true);
});

test("/articles/compose is NOT public — it must stay behind the login redirect", () => {
  assert.equal(isPublicPath("/articles/compose"), false);
});

test("a hypothetical /articles/edit/[id] shape is not public (only exactly 3 segments match)", () => {
  assert.equal(isPublicPath("/articles/edit/some-id"), false);
});

test("private, unrelated routes stay gated", () => {
  assert.equal(isPublicPath("/messages"), false);
  assert.equal(isPublicPath("/settings"), false);
  assert.equal(isPublicPath("/watch"), false);
});
