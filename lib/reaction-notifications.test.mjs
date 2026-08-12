import test from "node:test";
import assert from "node:assert/strict";

import { runReactionNotificationSideEffects } from "./reaction-notifications.mjs";

test("runReactionNotificationSideEffects swallows notification failures", async () => {
  let deleteCalls = 0;
  let sendCalls = 0;

  await runReactionNotificationSideEffects({
    recipientUid: "recipient",
    actorUid: "actor",
    userId: "other-user",
    action: "send",
    oldType: "like",
    type: "dislike",
    postId: "post-1",
    deleteNotification: async () => {
      deleteCalls += 1;
      throw new Error("delete failed");
    },
    sendNotification: async () => {
      sendCalls += 1;
      throw new Error("send failed");
    },
  });

  assert.equal(deleteCalls, 1);
  assert.equal(sendCalls, 0);
});

test("runReactionNotificationSideEffects forwards post ids to deletes", async () => {
  let deletedWithPostId = null;
  let sentWithPostId = null;

  await runReactionNotificationSideEffects({
    recipientUid: "recipient",
    actorUid: "actor",
    userId: "other-user",
    action: "send",
    oldType: "like",
    type: "dislike",
    postId: "post-1",
    deleteNotification: async payload => {
      deletedWithPostId = payload.postId ?? null;
    },
    sendNotification: async payload => {
      sentWithPostId = payload.postId ?? null;
    },
  });

  assert.equal(deletedWithPostId, "post-1");
  assert.equal(sentWithPostId, "post-1");
});

test("runReactionNotificationSideEffects no-ops for self notifications", async () => {
  let called = false;

  await runReactionNotificationSideEffects({
    recipientUid: "user",
    actorUid: "user",
    userId: "user",
    action: "send",
    type: "like",
    postId: "post-1",
    deleteNotification: async () => {
      called = true;
    },
    sendNotification: async () => {
      called = true;
    },
  });

  assert.equal(called, false);
});
