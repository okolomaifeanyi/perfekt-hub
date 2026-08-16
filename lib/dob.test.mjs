import assert from "node:assert/strict";
import test from "node:test";
import { parseDob, calculateAge, getNextBirthdayDate, isBirthdayToday } from "./dob.mjs";

test("parseDob handles the app's stored format (\"MMMM d, yyyy\")", () => {
  const date = parseDob("August 16, 2000");
  assert.equal(date?.getFullYear(), 2000);
  assert.equal(date?.getMonth(), 7);
  assert.equal(date?.getDate(), 16);
});

test("parseDob returns null for missing/invalid input", () => {
  assert.equal(parseDob(undefined), null);
  assert.equal(parseDob(""), null);
  assert.equal(parseDob("not a date"), null);
});

test("calculateAge counts a birthday already passed this year", () => {
  const now = new Date(2026, 7, 16); // Aug 16, 2026
  assert.equal(calculateAge("August 1, 2000", now), 26);
});

test("calculateAge doesn't count a birthday that hasn't happened yet this year", () => {
  const now = new Date(2026, 7, 16); // Aug 16, 2026
  assert.equal(calculateAge("December 25, 2000", now), 25);
});

test("calculateAge returns null for an unset dob — the bug this replaces silently returned null too, but for every dob, not just missing ones", () => {
  assert.equal(calculateAge(null), null);
});

test("getNextBirthdayDate rolls forward to next year once this year's date has passed", () => {
  const now = new Date(2026, 7, 16); // Aug 16, 2026
  const next = getNextBirthdayDate("January 1, 1990", now);
  assert.equal(next?.getFullYear(), 2027);
  assert.equal(next?.getMonth(), 0);
  assert.equal(next?.getDate(), 1);
});

test("getNextBirthdayDate stays in the current year when the date hasn't passed yet", () => {
  const now = new Date(2026, 7, 16); // Aug 16, 2026
  const next = getNextBirthdayDate("December 25, 1990", now);
  assert.equal(next?.getFullYear(), 2026);
  assert.equal(next?.getMonth(), 11);
  assert.equal(next?.getDate(), 25);
});

test("getNextBirthdayDate treats today itself as the next occurrence, not a year away", () => {
  const now = new Date(2026, 7, 16); // Aug 16, 2026
  const next = getNextBirthdayDate("August 16, 1990", now);
  assert.equal(next?.getFullYear(), 2026);
  assert.equal(next?.getMonth(), 7);
  assert.equal(next?.getDate(), 16);
});

test("isBirthdayToday matches month/day regardless of birth year", () => {
  const now = new Date(2026, 7, 16); // Aug 16, 2026
  assert.equal(isBirthdayToday("August 16, 1990", now), true);
  assert.equal(isBirthdayToday("August 17, 1990", now), false);
});
