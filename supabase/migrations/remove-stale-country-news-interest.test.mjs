import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  "supabase/migrations/20260816020000_remove_stale_country_news_interest.sql"
);

test("stale country_news interest cleanup migration only deletes that one key", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /delete from public\.user_interests/i);
  assert.match(sql, /where interest_key = 'topic:country_news'/i);
});
