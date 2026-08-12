import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReactionRequestBody,
  buildReactionRequestInit,
} from "./reaction-request.mjs";

test("buildReactionRequestBody omits user identifiers", () => {
  assert.deepEqual(buildReactionRequestBody("post-1", "like"), {
    postId: "post-1",
    type: "like",
  });
});

test("buildReactionRequestInit attaches bearer token when present", () => {
  const request = buildReactionRequestInit({
    postId: "post-1",
    type: "dislike",
    accessToken: "token-123",
  });

  assert.equal(request.method, "POST");
  assert.equal(request.credentials, "include");
  assert.equal(request.headers.Authorization, "Bearer token-123");
  assert.equal(request.body, JSON.stringify({ postId: "post-1", type: "dislike" }));
});
