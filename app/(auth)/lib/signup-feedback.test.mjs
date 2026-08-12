import assert from "node:assert/strict";
import test from "node:test";
import { getSignupAlertConfig } from "./signup-feedback.mjs";

test("returns a neutral success alert for completed signup", () => {
  assert.deepEqual(getSignupAlertConfig({ success: true, message: "Account created." }), {
    title: "Check your email",
    description: "Account created.",
    variant: "default",
  });
});

test("returns a destructive alert for signup errors", () => {
  assert.deepEqual(getSignupAlertConfig({ success: false, message: "Email already exists." }), {
    title: "Signup Error",
    description: "Email already exists.",
    variant: "destructive",
  });
});

test("returns null when there is no message to show", () => {
  assert.equal(getSignupAlertConfig({ success: true }), null);
});
