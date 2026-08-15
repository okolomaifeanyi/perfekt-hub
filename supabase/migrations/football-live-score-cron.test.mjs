import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const schedulePath = resolve(
  "supabase/migrations/20260815040000_football_live_score_cron.sql"
);
const getFixPath = resolve(
  "supabase/migrations/20260815041000_football_live_score_cron_use_get.sql"
);

test("football live-score cron migration enables pg_cron/pg_net and schedules every 2 minutes", () => {
  const sql = readFileSync(schedulePath, "utf8");

  assert.match(sql, /create extension if not exists pg_cron/i);
  assert.match(sql, /create extension if not exists pg_net/i);
  assert.match(sql, /cron\.schedule\(\s*'football-live-scores',\s*'\*\/2 \* \* \* \*'/i);
  // The secret must be looked up from Vault at call time, never inlined —
  // inlining it would commit a live secret to git.
  assert.match(sql, /vault\.decrypted_secrets/i);
  assert.doesNotMatch(sql, /Bearer [A-Za-z0-9]{20,}/);
});

test("cron fix migration switches pg_net from http_post to http_get", () => {
  const sql = readFileSync(getFixPath, "utf8");

  assert.match(sql, /cron\.unschedule\('football-live-scores'\)/i);
  assert.match(sql, /net\.http_get\(/i);
  assert.doesNotMatch(sql, /net\.http_post\(/i);
});
