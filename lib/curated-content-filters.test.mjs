import test from "node:test";
import assert from "node:assert/strict";
import { buildFootballScoreFilter } from "./curated-content-filters.mjs";

test("buildFootballScoreFilter returns null when neither leagueCodes nor teamIds are given", () => {
  assert.equal(buildFootballScoreFilter([], []), null);
  assert.equal(buildFootballScoreFilter(undefined, undefined), null);
});

test("buildFootballScoreFilter filters by league alone when only leagueCodes is given", () => {
  const filter = buildFootballScoreFilter(["PL", "CL"], []);
  assert.equal(filter, "metadata->>competitionCode.in.(PL,CL)");
});

test("buildFootballScoreFilter filters by team alone when only teamIds is given", () => {
  const filter = buildFootballScoreFilter([], ["1", "2"]);
  assert.equal(
    filter,
    "metadata->homeTeam->>id.in.(1,2),metadata->awayTeam->>id.in.(1,2)"
  );
});

test("buildFootballScoreFilter unions league and team matches instead of intersecting them", () => {
  // Regression test: a visitor who follows a league AND a specific team
  // used to get matches ANDed together (that team's matches within that
  // league only), which silently hid every other match in a followed
  // league the moment they also followed any one team — exactly the
  // "scores show, then disappear" bug this fixes. It must be a union: every
  // match in a followed league, plus every match of a followed team, even
  // one playing in a league the visitor never ticked.
  const filter = buildFootballScoreFilter(["PL"], ["1", "2"]);
  assert.equal(
    filter,
    "metadata->>competitionCode.in.(PL),metadata->homeTeam->>id.in.(1,2),metadata->awayTeam->>id.in.(1,2)"
  );
});
