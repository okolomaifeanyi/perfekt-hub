import test from "node:test";
import assert from "node:assert/strict";
import { formatGroupsContext, isSafeGroupPost } from "./groups-context.mjs";

test("formatGroupsContext returns null for no groups", () => {
  assert.equal(formatGroupsContext([]), null);
  assert.equal(formatGroupsContext(null), null);
});

test("formatGroupsContext groups posts under their group name", () => {
  const text = formatGroupsContext([
    {
      groupName: "USDO",
      posts: [{ authorUsername: "perfekt", text: "Welcome everyone", media: [], createdAt: new Date() }],
    },
  ]);
  assert.match(text, /^\[Group: USDO\]\n {2}@perfekt: "Welcome everyone" — /);
});

test("formatGroupsContext skips groups with no postable content and omits empty sections", () => {
  const text = formatGroupsContext([
    { groupName: "Empty Group", posts: [] },
    { groupName: "Real Group", posts: [{ authorUsername: "a", text: "hi", media: [], createdAt: new Date() }] },
  ]);
  assert.ok(!text.includes("Empty Group"));
  assert.ok(text.includes("Real Group"));
});

test("isSafeGroupPost excludes toxic or sensitive posts", () => {
  assert.equal(isSafeGroupPost({ textToxic: true }), false);
  assert.equal(isSafeGroupPost({ moderationStatus: "sensitive" }), false);
  assert.equal(isSafeGroupPost({}), true);
});
