import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { getCompactTimeAgo } from "./time-format.mjs";

test("getCompactTimeAgo formats minutes, hours, days, and calendar dates", () => {
  mock.timers.enable({ now: new Date("2025-06-08T12:00:00Z") });

  try {
    assert.equal(getCompactTimeAgo(new Date("2025-06-08T11:30:00Z")), "30m");
    assert.equal(getCompactTimeAgo(new Date("2025-06-08T09:00:00Z")), "3h");
    assert.equal(getCompactTimeAgo(new Date("2025-06-04T12:00:00Z")), "4d");
    assert.equal(getCompactTimeAgo(new Date("2024-06-08T12:00:00Z")), "8 Jun 2024");
  } finally {
    mock.timers.reset();
  }
});
