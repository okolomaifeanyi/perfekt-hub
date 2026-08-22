import test from "node:test";
import assert from "node:assert/strict";
import { formatGoals, formatBookings, buildRecapPrompt } from "./match-summary-recap.mjs";

test("formatGoals returns null when there are no goals", () => {
  assert.equal(formatGoals([], 1), null);
  assert.equal(formatGoals(null, 1), null);
  assert.equal(formatGoals(undefined, 1), null);
});

test("formatGoals formats a home goal with an assist", () => {
  const goals = [
    {
      minute: 34,
      type: "REGULAR",
      team: { id: 1 },
      scorer: { name: "Haaland" },
      assist: { name: "De Bruyne" },
    },
  ];
  const result = formatGoals(goals, 1);
  assert.equal(result, "Goals: 34' Haaland (assist: De Bruyne) (home)");
});

test("formatGoals marks a penalty and an own goal, and an away goal with no assist", () => {
  const goals = [
    { minute: 12, type: "PENALTY", team: { id: 2 }, scorer: { name: "Salah" }, assist: null },
    { minute: 90, injuryTime: 3, type: "OWN", team: { id: 1 }, scorer: { name: "Walker" }, assist: null },
  ];
  const result = formatGoals(goals, 1);
  assert.equal(result, "Goals: 12' Salah [pen] (away), 90'+3 Walker [OG] (home)");
});

test("formatBookings returns null when there are no bookings", () => {
  assert.equal(formatBookings([], 1), null);
  assert.equal(formatBookings(undefined, 1), null);
});

test("formatBookings formats a red card and a yellow card with side", () => {
  const bookings = [
    { minute: 23, card: "RED", team: { id: 2 }, player: { name: "Casemiro" } },
    { minute: 55, card: "YELLOW", team: { id: 1 }, player: { name: "Rice" } },
  ];
  const result = formatBookings(bookings, 1);
  assert.equal(result, "Cards: 23' Red card — Casemiro (away), 55' Yellow card — Rice (home)");
});

test("buildRecapPrompt includes the pre-match prediction when one was made", () => {
  const prompt = buildRecapPrompt({
    homeName: "Man City",
    awayName: "Liverpool",
    competition: "Premier League",
    kickoff: "2026-08-20T15:00:00Z",
    finalScore: { home: 2, away: 1 },
    goalsLine: "Goals: 34' Haaland (home)",
    bookingsLine: null,
    predictionBody: "Prediction: Man City to win",
  });

  assert.match(prompt, /Final score: Man City 2-1 Liverpool/);
  assert.match(prompt, /Goals: 34' Haaland \(home\)/);
  assert.match(prompt, /Pre-match prediction that was made: "Prediction: Man City to win"/);
  assert.doesNotMatch(prompt, /No pre-match prediction/);
});

test("buildRecapPrompt says plainly when no prediction was made and no goal data is available", () => {
  const prompt = buildRecapPrompt({
    homeName: "Man City",
    awayName: "Liverpool",
    competition: "Premier League",
    kickoff: "2026-08-20T15:00:00Z",
    finalScore: { home: 2, away: 1 },
    goalsLine: null,
    bookingsLine: null,
    predictionBody: null,
  });

  assert.match(prompt, /No goal-by-goal data available for this match\./);
  assert.match(prompt, /No pre-match prediction was made for this fixture\./);
});
