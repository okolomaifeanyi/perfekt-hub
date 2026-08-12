import test from "node:test";
import assert from "node:assert/strict";
import { buildBirthdayReminders, buildMemoryReminders } from "./calendar-reminders.mjs";

test("buildBirthdayReminders sorts the next upcoming birthdays first", () => {
  const reminders = buildBirthdayReminders(
    [
      { uid: "a", username: "alpha", dob: "2000-06-09" },
      { uid: "b", username: "beta", dob: "2000-06-20" },
    ],
    new Date("2026-06-08T12:00:00Z")
  );

  assert.equal(reminders.length, 2);
  assert.equal(reminders[0].friend.username, "alpha");
  assert.equal(reminders[0].daysUntil, 1);
});

test("buildMemoryReminders keeps month and year memories", () => {
  const reminders = buildMemoryReminders(
    [
      { id: "month", createdAt: new Date("2026-05-09T00:00:00Z") },
      { id: "year", createdAt: new Date("2025-06-08T00:00:00Z") },
      { id: "other", createdAt: new Date("2026-06-01T00:00:00Z") },
    ],
    new Date("2026-06-08T00:00:00Z")
  );

  assert.deepEqual(
    reminders.map(reminder => reminder.label),
    ["1 month ago", "1 year ago"]
  );
});
