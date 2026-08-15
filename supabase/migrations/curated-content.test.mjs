import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const schemaPath = resolve(
  "supabase/migrations/20260815030000_curated_content.sql"
);
const dedupFixPath = resolve(
  "supabase/migrations/20260815031000_curated_content_fix_dedup_index.sql"
);

test("curated_content migration creates a read-only, service-role-written table", () => {
  const sql = readFileSync(schemaPath, "utf8");

  assert.match(sql, /create table if not exists public\.curated_content/i);
  assert.match(sql, /alter table public\.curated_content enable row level security/i);
  assert.match(sql, /grant select on public\.curated_content to anon, authenticated/i);
  assert.match(
    sql,
    /grant select, insert, update, delete on public\.curated_content to service_role/i
  );
  // No insert/update/delete policy for anon/authenticated — only a select
  // policy, so writes stay restricted to the service role (bypasses RLS).
  assert.doesNotMatch(sql, /for (insert|update|delete)/i);
  assert.match(sql, /create trigger curated_content_touch_updated_at/i);
});

test("dedup index fix drops the partial predicate so PostgREST's upsert can target it", () => {
  const sql = readFileSync(dedupFixPath, "utf8");

  assert.match(sql, /drop index if exists public\.curated_content_dedup_idx/i);
  // The `;` immediately after the column list (nothing between the columns
  // and the statement end) confirms the new index carries no `where`
  // predicate — that predicate is what made ON CONFLICT inference fail.
  assert.match(
    sql,
    /create unique index if not exists curated_content_dedup_idx\s+on public\.curated_content \(category, external_id\);/i
  );
});
