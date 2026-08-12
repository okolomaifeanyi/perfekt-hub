import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  "supabase/migrations/20260606000001_user_profile_rpc.sql"
);

test("user profile rpc migration adds security definer helpers", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /create or replace function public\.generate_unique_username/i);
  assert.match(sql, /create or replace function public\.lookup_user_email_by_username/i);
  assert.match(sql, /create or replace function public\.get_user_profile_by_uid/i);
  assert.match(sql, /create or replace function public\.sync_user_profile/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /grant execute on function public\.generate_unique_username\(text\) to anon, authenticated;/i);
  assert.match(sql, /grant execute on function public\.lookup_user_email_by_username\(text\) to anon, authenticated;/i);
  assert.match(sql, /grant execute on function public\.sync_user_profile\(jsonb\) to authenticated;/i);
  assert.match(sql, /on conflict \(uid\) do update set/i);
  assert.doesNotMatch(sql, /select \* from public\.users where username = candidate/i);
});
