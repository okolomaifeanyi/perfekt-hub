import test from "node:test";
import assert from "node:assert/strict";

import { countUnreadNotificationsForUser } from "./notification-count.mjs";

test("countUnreadNotificationsForUser filters unread notifications by recipient", async () => {
  const calls = [];
  const firestore = {
    collection(name) {
      calls.push(["collection", name]);
      return {
        where(field, op, value) {
          calls.push(["where", field, op, value]);
          return this;
        },
        async get() {
          calls.push(["get"]);
          return { size: 4 };
        },
      };
    },
  };

  const count = await countUnreadNotificationsForUser({
    firestore,
    userId: "user-123",
  });

  assert.equal(count, 4);
  assert.deepEqual(calls, [
    ["collection", "notifications"],
    ["where", "recipientUid", "==", "user-123"],
    ["where", "read", "==", false],
    ["get"],
  ]);
});
