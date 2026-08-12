import assert from "node:assert/strict";
import test from "node:test";
import { canRunPostBackgroundJobs } from "./post-jobs.mjs";

test("canRunPostBackgroundJobs requires a service role key", () => {
  const original = process.env.SUPABASE_SERVICE_ROLE_KEY;

  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.equal(canRunPostBackgroundJobs(), false);

  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  assert.equal(canRunPostBackgroundJobs(), true);

  if (original === undefined) {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    process.env.SUPABASE_SERVICE_ROLE_KEY = original;
  }
});
