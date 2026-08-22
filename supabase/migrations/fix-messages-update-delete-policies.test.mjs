import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  "supabase/migrations/20260822010000_fix_messages_update_delete_policies.sql"
);

test("messages update/delete policies are restricted to the message's own sender only", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /drop policy if exists "messages_participant_update" on public\.messages/i);
  assert.match(sql, /drop policy if exists "messages_participant_delete" on public\.messages/i);

  const updatePolicy = sql.match(/create policy "messages_participant_update"[\s\S]*?;/i);
  assert.ok(updatePolicy, "expected a messages_participant_update policy");
  assert.match(updatePolicy[0], /using \(auth\.uid\(\)::text = senderId\)/i);
  assert.match(updatePolicy[0], /with check \(auth\.uid\(\)::text = senderId\)/i);
  // Regression guard: the bug was an `or exists(...)` clause letting any
  // conversation participant satisfy the policy, not just the sender.
  assert.doesNotMatch(updatePolicy[0], /or\s+exists/i);

  const deletePolicy = sql.match(/create policy "messages_participant_delete"[\s\S]*?;/i);
  assert.ok(deletePolicy, "expected a messages_participant_delete policy");
  assert.match(deletePolicy[0], /using \(auth\.uid\(\)::text = senderId\)/i);
  assert.doesNotMatch(deletePolicy[0], /or\s+exists/i);
});
