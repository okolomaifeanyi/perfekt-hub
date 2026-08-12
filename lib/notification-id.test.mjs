import test from "node:test";
import assert from "node:assert/strict";

import { buildNotificationDocId } from "./notification-id.mjs";

test("buildNotificationDocId returns a deterministic id", () => {
  const first = buildNotificationDocId({
    recipientUid: "recipient-1",
    actorUid: "actor-2",
    type: "like",
    postId: "post-3",
  });

  const second = buildNotificationDocId({
    recipientUid: "recipient-1",
    actorUid: "actor-2",
    type: "like",
    postId: "post-3",
  });

  assert.equal(first, second);
  assert.equal(
    first,
    "notification:recipient-1:actor-2:like:post-3"
  );
});

test("buildNotificationDocId differentiates post ids and missing post ids", () => {
  const withoutPost = buildNotificationDocId({
    recipientUid: "recipient-1",
    actorUid: "actor-2",
    type: "follow",
  });

  const withPost = buildNotificationDocId({
    recipientUid: "recipient-1",
    actorUid: "actor-2",
    type: "follow",
    postId: "post-3",
  });

  assert.notEqual(withoutPost, withPost);
});
