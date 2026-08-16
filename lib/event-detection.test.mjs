import assert from "node:assert/strict";
import test from "node:test";
import { looksLikeEvent } from "./event-detection.mjs";

test("looksLikeEvent flags a keyword + explicit time together", () => {
  assert.equal(looksLikeEvent("Party this Friday at 8pm, don't miss it!"), true);
});

test("looksLikeEvent flags a keyword + month/day together", () => {
  assert.equal(looksLikeEvent("You're invited to our wedding on December 25th"), true);
});

test("looksLikeEvent flags a keyword + relative date together", () => {
  assert.equal(looksLikeEvent("Save the date — team meetup tomorrow!"), true);
});

test("looksLikeEvent does not flag a bare event word with no date/time", () => {
  assert.equal(looksLikeEvent("That party was so much fun last night"), false);
});

test("looksLikeEvent does not flag a bare date/time mention with no event word", () => {
  assert.equal(looksLikeEvent("See you Friday at 8pm for the usual hangout"), false);
});

test("looksLikeEvent does not flag ordinary text", () => {
  assert.equal(looksLikeEvent("Just finished a great book, highly recommend it"), false);
});

test("looksLikeEvent ignores very short text even with strong signals", () => {
  assert.equal(looksLikeEvent("party 8pm"), false);
});

test("looksLikeEvent is case-insensitive", () => {
  assert.equal(looksLikeEvent("CONCERT this SATURDAY at 7PM, come through!"), true);
});
