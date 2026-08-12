import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDirectConversationId,
  getOtherConversationParticipant,
  parseDirectConversationId,
} from "./conversation-utils.mjs";

test("buildDirectConversationId sorts participant ids", () => {
  assert.equal(buildDirectConversationId("b", "a"), "a_b");
});

test("parseDirectConversationId returns participants", () => {
  assert.deepEqual(parseDirectConversationId("a_b"), ["a", "b"]);
});

test("getOtherConversationParticipant returns the opposite participant", () => {
  assert.equal(
    getOtherConversationParticipant(["a", "b"], "a"),
    "b"
  );
});
