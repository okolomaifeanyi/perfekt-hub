import assert from "node:assert/strict";
import test from "node:test";
import { mapSupabaseAuthError } from "./auth-errors.mjs";

test("mapSupabaseAuthError handles known auth codes", () => {
  assert.equal(
    mapSupabaseAuthError({ code: "auth/invalid-email" }),
    "The email address is not valid. Please check the format."
  );
  assert.equal(
    mapSupabaseAuthError({ code: "auth/account-exists-with-different-credential" }),
    "An account with this email already exists but with a different login method. Please try logging in with the original method."
  );
});

test("mapSupabaseAuthError falls back gracefully", () => {
  assert.equal(
    mapSupabaseAuthError({ code: "something-else" }),
    "An unknown error occurred. Please try again later."
  );
  assert.equal(
    mapSupabaseAuthError({}),
    "An unexpected error occurred. Please try again."
  );
});
