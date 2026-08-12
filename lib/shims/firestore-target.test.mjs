import assert from "node:assert/strict";
import test from "node:test";
import { getUsersTarget } from "./firestore-target.mjs";

test("getUsersTarget resolves single user documents by uid", () => {
  const target = getUsersTarget(["users", "alice"]);

  assert.equal(target.table, "users");
  assert.equal(target.idColumn, "uid");
  assert.deepEqual(target.baseFilters, []);
});

test("getUsersTarget resolves user feed meta documents", () => {
  const target = getUsersTarget(["users", "alice", "meta", "feed"]);

  assert.equal(target.table, "user_meta");
  assert.equal(target.idColumn, "id");
  assert.deepEqual(target.baseFilters, [
    { field: "uid", op: "==", value: "alice" },
    { field: "key", op: "==", value: "feed" },
  ]);
});

test("getUsersTarget resolves saved posts scoped to the owning user", () => {
  const target = getUsersTarget(["users", "alice", "savedPosts", "post-1"]);

  assert.equal(target.table, "saved_posts");
  assert.equal(target.idColumn, "id");
  assert.deepEqual(target.baseFilters, [{ field: "uid", op: "==", value: "alice" }]);
});

test("getUsersTarget fails safe for unrecognized subcollections instead of falling back to the users table", () => {
  const target = getUsersTarget(["users", "alice", "groups"]);

  assert.notEqual(target.table, "users");
  assert.equal(target.table, "unsupported_subcollection");
});
