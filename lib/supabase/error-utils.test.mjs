import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUnknownError } from "./error-utils.mjs";

test("normalizeUnknownError preserves Supabase error metadata", () => {
  const error = normalizeUnknownError({
    code: "42501",
    details: null,
    hint: "Grant the required privileges.",
    message: "permission denied for table user_meta",
  });

  assert.equal(error.message, "permission denied for table user_meta");
  assert.equal(error.code, "42501");
  assert.equal(error.hint, "Grant the required privileges.");
});

test("normalizeUnknownError formats object errors without a message", () => {
  const error = normalizeUnknownError({
    code: "42501",
    hint: "Grant the required privileges.",
  });

  assert.match(error.message, /code: 42501/);
  assert.match(error.message, /Grant the required privileges\./);
});
