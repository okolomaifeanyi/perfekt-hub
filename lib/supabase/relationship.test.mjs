import assert from "node:assert/strict";
import test from "node:test";
import {
  getRelationshipTarget,
  normalizeRelationshipWriteRow,
} from "./relationship.mjs";

test("relationship helper resolves collection-level listing queries without a target uid", () => {
  const target = getRelationshipTarget(["users", "alice", "friends"]);

  assert.equal(target.table, "user_relationships");
  assert.deepEqual(target.baseFilters, [
    { field: "owneruid", op: "==", value: "alice" },
    { field: "kind", op: "==", value: "friend" },
  ]);
  assert.equal(target.snapshotIdField, "targetuid");
  assert.equal(target.docId, undefined);
  assert.equal(target.row, undefined);
});

test("relationship helper maps followers to the reverse follower row", () => {
  const target = getRelationshipTarget(["users", "alice", "followers", "bob"]);

  assert.deepEqual(target.row, {
    owneruid: "bob",
    targetuid: "alice",
    kind: "follow",
  });
  assert.equal(target.docId, "bob");
  assert.equal(target.rowId, "owneruid:bob|kind:follow|targetuid:alice");
  assert.equal(target.snapshotIdField, "owneruid");
});

test("relationship helper maps friend requests and stores extra fields in payload", () => {
  const row = normalizeRelationshipWriteRow(
    ["users", "alice", "friendRequestsSent", "bob"],
    {
      from: "alice",
      to: "bob",
      createdAt: Date.now(),
    }
  );

  assert.equal(row.id, "owneruid:alice|kind:request-sent|targetuid:bob");
  assert.equal(row.owneruid, "alice");
  assert.equal(row.targetuid, "bob");
  assert.equal(row.kind, "request-sent");
  assert.ok(row.createdat instanceof Date);
  assert.deepEqual(row.payload, {
    from: "alice",
    to: "bob",
  });
});
