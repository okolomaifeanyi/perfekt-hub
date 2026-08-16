import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  "supabase/migrations/20260816050000_curated_content_comments_and_views.sql"
);

test("view count migration adds a column plus a security-definer increment RPC", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /add column if not exists view_count integer not null default 0/i);
  assert.match(sql, /create or replace function public\.increment_curated_content_view/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /update public\.curated_content set view_count = view_count \+ 1/i);
  assert.match(sql, /grant execute on function public\.increment_curated_content_view\(uuid\) to authenticated, anon/i);
});

test("comments migration creates an owner-writable, publicly-readable table", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /create table if not exists public\.curated_content_comments/i);
  assert.match(sql, /body text not null/i);
  assert.match(sql, /for select\s*\nusing \(true\)/i);

  for (const op of ["insert", "delete"]) {
    const pattern = new RegExp(
      `for ${op}[\\s\\S]{0,80}(using|with check) \\(auth\\.uid\\(\\)::text = uid\\)`,
      "i"
    );
    assert.match(sql, pattern, `expected an owner-only ${op} policy`);
  }
});
