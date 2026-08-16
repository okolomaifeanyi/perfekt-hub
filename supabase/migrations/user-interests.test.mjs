import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve("supabase/migrations/20260816000000_user_interests.sql");

test("user_interests migration is owner-only, insert/delete (no update)", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /create table if not exists public\.user_interests/i);
  assert.match(sql, /primary key \(uid, interest_key\)/i);
  assert.match(sql, /alter table public\.user_interests enable row level security/i);
  assert.match(sql, /grant select, insert, delete on public\.user_interests to authenticated/i);

  assert.match(sql, /using \(auth\.uid\(\)::text = uid\)/i);
  assert.match(sql, /with check \(auth\.uid\(\)::text = uid\)/i);
  // Toggled by insert/delete only, same as saved_posts — no update policy,
  // and no update grant for the authenticated role.
  assert.doesNotMatch(sql, /for update/i);
  assert.doesNotMatch(sql, /grant select, insert, update, delete on public\.user_interests to authenticated/i);
});
