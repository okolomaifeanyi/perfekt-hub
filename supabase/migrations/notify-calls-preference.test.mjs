import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  "supabase/migrations/20260815010000_notify_calls_preference.sql"
);

test("notify_calls preference migration adds the column with a safe default", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(
    sql,
    /alter table public\.notification_preferences\s+add column if not exists notify_calls boolean not null default true;/i
  );
});
