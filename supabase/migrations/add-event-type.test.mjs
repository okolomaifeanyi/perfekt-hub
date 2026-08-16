import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve("supabase/migrations/20260816040000_add_event_type.sql");

test("event type migration adds a defaulted, constrained eventtype column", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /add column if not exists eventtype text not null default 'custom'/i);
  assert.match(sql, /check \(eventtype in \('custom', 'birthday'\)\)/i);
});
