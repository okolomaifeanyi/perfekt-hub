import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  "supabase/migrations/20260815020000_enable_realtime.sql"
);

test("enable realtime migration idempotently publishes the core listener tables", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /alter publication supabase_realtime add table/i);
  assert.match(sql, /pg_publication_tables/i);
  for (const table of [
    "users",
    "posts",
    "post_engagements",
    "conversations",
    "messages",
    "notifications",
    "user_meta",
    "saved_posts",
    "user_relationships",
  ]) {
    assert.ok(sql.includes(`'${table}'`), `expected ${table} in the publication list`);
  }
});
