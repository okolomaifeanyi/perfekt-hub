import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  "supabase/migrations/20260607000000_post_counter_triggers.sql"
);

test("post counter migration keeps post count updates in database triggers", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /create or replace function app_private\.sync_post_counters/i);
  assert.match(sql, /after insert on public\.posts/i);
  assert.match(sql, /after delete on public\.posts/i);
  assert.match(sql, /update public\.users\s+set postscount = coalesce\(postscount, 0\) \+ 1/i);
  assert.match(sql, /update public\.posts\s+set replycount = coalesce\(replycount, 0\) \+ 1/i);
  assert.match(sql, /update public\.posts\s+set quotecount = coalesce\(quotecount, 0\) \+ 1/i);
  assert.match(sql, /update public\.posts\s+set replycount = greatest\(coalesce\(replycount, 0\) - 1, 0\)/i);
  assert.match(sql, /update public\.posts\s+set quotecount = greatest\(coalesce\(quotecount, 0\) - 1, 0\)/i);
});
