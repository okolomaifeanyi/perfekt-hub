import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  "supabase/migrations/20260816030000_curated_content_reactions.sql"
);

test("curated_content_reactions migration creates an owner-writable, publicly-readable table", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /create table if not exists public\.curated_content_reactions/i);
  assert.match(sql, /primary key \(content_id, uid\)/i);
  assert.match(sql, /type in \('like', 'dislike'\)/i);

  // Public read (matches curated_content's own visibility), owner-only writes.
  assert.match(sql, /for select\s*\nusing \(true\)/i);
  assert.match(sql, /grant select on public\.curated_content_reactions to anon/i);

  for (const op of ["insert", "update", "delete"]) {
    const pattern = new RegExp(
      `for ${op}[\\s\\S]{0,80}(using|with check) \\(auth\\.uid\\(\\)::text = uid\\)`,
      "i"
    );
    assert.match(sql, pattern, `expected an owner-only ${op} policy`);
  }
});
