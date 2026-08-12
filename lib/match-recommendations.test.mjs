import assert from "node:assert/strict";
import test from "node:test";
import { rankMatchCandidates } from "./match-recommendations.mjs";

test("rankMatchCandidates prefers compatible candidates with explicit preferences", () => {
  const ranked = rankMatchCandidates(
    [
      {
        id: "a",
        gender: "female",
        workMatch: 3,
        ageDiff: 1,
        interestMatch: 4,
        friendOfFriend: 0,
      },
      {
        id: "b",
        gender: "female",
        workMatch: 0,
        ageDiff: 8,
        interestMatch: 1,
        friendOfFriend: 1,
      },
    ],
    {
      genderPreference: "female",
      ageRange: [24, 34],
      relationshipIntent: "marriage",
    }
  );

  assert.equal(ranked[0].id, "a");
});
