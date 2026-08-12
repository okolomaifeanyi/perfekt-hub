import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeFieldName,
  normalizeReadRow,
  normalizeWriteRow,
} from "./firestore-schema.mjs";

test("normalizeFieldName lowercases Firestore fields", () => {
  assert.equal(normalizeFieldName("ownerUid"), "owneruid");
  assert.equal(normalizeFieldName("createdAt"), "createdat");
});

test("normalizeWriteRow lowercases keys and converts timestamp fields", () => {
  const createdAt = "2026-01-01T00:00:00.000Z";
  const row = normalizeWriteRow("users", {
    fullName: "Test User",
    photoURL: "https://example.com/avatar.png",
    createdAt,
    fullName_lowercase: "test user",
  });

  assert.deepEqual(Object.keys(row).sort(), [
    "createdat",
    "fullname",
    "fullname_lowercase",
    "photourl",
  ]);
  assert.equal(row.fullname, "Test User");
  assert.equal(row.photourl, "https://example.com/avatar.png");
  assert.ok(row.createdat instanceof Date);
  assert.equal(row.createdat.toISOString(), createdAt);
});

test("normalizeReadRow adds app field aliases and timestamp wrappers", () => {
  const createdAt = "2026-01-01T00:00:00.000Z";
  const row = normalizeReadRow("users", {
    uid: "user-1",
    fullname: "Test User",
    photourl: "https://example.com/avatar.png",
    createdat: createdAt,
    fullname_lowercase: "test user",
  });

  assert.equal(row.fullName, "Test User");
  assert.equal(row.photoURL, "https://example.com/avatar.png");
  assert.ok(row.createdAt instanceof Date);
  assert.ok(row.createdAt);
  assert.equal(row.createdAt.toDate().toISOString(), createdAt);
  assert.equal(new Date(row.createdAt).toISOString(), createdAt);
  assert.equal(row.fullName_lowercase, "test user");
});

test("normalizeReadRow exposes user_meta value payload fields", () => {
  const row = normalizeReadRow("user_meta", {
    uid: "user-1",
    key: "feed",
    value: {
      feedAuthorIds: ["a", "b"],
    },
  });

  assert.deepEqual(row.feedAuthorIds, ["a", "b"]);
});

test("normalizeReadRow maps legacy lowercased user_meta payload keys", () => {
  const row = normalizeReadRow("user_meta", {
    uid: "user-1",
    key: "feed",
    value: {
      feedauthorids: ["a", "b"],
    },
  });

  assert.deepEqual(row.feedAuthorIds, ["a", "b"]);
});
