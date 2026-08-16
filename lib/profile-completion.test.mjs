import assert from "node:assert/strict";
import test from "node:test";
import { getProfileCompletion, PROFILE_COMPLETION_FIELDS } from "./profile-completion.mjs";

test("getProfileCompletion is 0% for an empty profile and lists every field as missing", () => {
  const result = getProfileCompletion({});
  assert.equal(result.percent, 0);
  assert.equal(result.isComplete, false);
  assert.equal(result.missing.length, PROFILE_COMPLETION_FIELDS.length);
});

test("getProfileCompletion is 100% once every tracked field has a non-empty value", () => {
  const result = getProfileCompletion({
    fullName: "Ada Lovelace",
    dob: "December 10, 1815",
    photoURL: "https://example.com/a.jpg",
    gender: "female",
    relationship: "Single",
    country: "United Kingdom",
    bio: "Mathematician",
  });
  assert.equal(result.percent, 100);
  assert.equal(result.isComplete, true);
  assert.deepEqual(result.missing, []);
});

test("getProfileCompletion treats whitespace-only values the same as missing", () => {
  const result = getProfileCompletion({ fullName: "   ", dob: "" });
  assert.equal(result.missing.some(field => field.key === "fullName"), true);
  assert.equal(result.missing.some(field => field.key === "dob"), true);
});

test("getProfileCompletion rounds to the nearest whole percent for a partial profile", () => {
  // 2 of 7 fields filled = 28.57...% -> rounds to 29%
  const result = getProfileCompletion({ fullName: "Ada", dob: "1815-12-10" });
  assert.equal(result.percent, 29);
  assert.equal(result.missing.length, 5);
});
