import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  "supabase/migrations/20260815000000_rate_limiting.sql"
);

test("rate limiting migration adds an atomic, security-definer check function", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /create table if not exists public\.rate_limits/i);
  assert.match(sql, /alter table public\.rate_limits enable row level security/i);
  assert.match(sql, /create or replace function public\.check_rate_limit/i);
  assert.match(sql, /security definer/i);
  assert.match(
    sql,
    /grant execute on function public\.check_rate_limit\(text, integer, integer\) to anon, authenticated;/i
  );
  // No direct table grants to anon/authenticated — only the function
  // (running as its owner) may touch the table.
  assert.doesNotMatch(sql, /grant (select|insert|update|delete) on public\.rate_limits/i);
});
