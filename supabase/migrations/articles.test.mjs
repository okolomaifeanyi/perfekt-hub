import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const schemaPath = resolve("supabase/migrations/20260822020000_articles.sql");

function readSql() {
  return readFileSync(schemaPath, "utf8");
}

test("articles migration creates the table with RLS enabled", () => {
  const sql = readSql();
  assert.match(sql, /create table if not exists public\.articles/i);
  assert.match(sql, /alter table public\.articles enable row level security/i);
});

test("articles table references users and enforces the draft/published status check", () => {
  const sql = readSql();
  assert.match(sql, /authorUid text not null references public\.users\(uid\) on delete cascade/i);
  assert.match(sql, /status text not null default 'draft' check \(status in \('draft', 'published'\)\)/i);
});

test("slug uniqueness is scoped per author, not global", () => {
  const sql = readSql();
  assert.match(
    sql,
    /create unique index if not exists articles_author_slug_idx\s+on public\.articles \(authorUid, slug\);/i
  );
});

test("grants give anon/authenticated read access but writes require authentication", () => {
  const sql = readSql();
  assert.match(sql, /grant select on public\.articles to anon, authenticated/i);
  assert.match(sql, /grant insert, update, delete on public\.articles to authenticated/i);
  assert.match(sql, /grant select, insert, update, delete on public\.articles to service_role/i);
});

test("the select policy allows published articles for everyone and drafts only for their author", () => {
  const sql = readSql();
  const policyMatch = sql.match(
    /create policy "articles_read_published_or_own"[\s\S]*?using \(([\s\S]*?)\);/i
  );
  assert.ok(policyMatch, "expected to find the articles_read_published_or_own policy");
  assert.match(policyMatch[1], /status = 'published'/i);
  assert.match(policyMatch[1], /auth\.uid\(\)::text = authorUid/i);
});

test("insert/update/delete policies are all scoped to the article's own author, with no OR clause", () => {
  const sql = readSql();

  for (const policyName of ["articles_author_insert", "articles_author_update", "articles_author_delete"]) {
    const escapedName = policyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Stops at the statement's own closing `;` — deliberately narrower than
    // "up to the next create policy", which would also swallow that next
    // policy's leading comment block (and any stray "or"/"no" inside it).
    const policyRegex = new RegExp(`create policy "${escapedName}"[\\s\\S]*?;`, "i");
    const policyMatch = sql.match(policyRegex);
    assert.ok(policyMatch, `expected to find policy ${policyName}`);
    // The messages table bug this migration explicitly avoids repeating was
    // an `or exists(...)` clause letting a non-owner satisfy the policy —
    // guard against the same shape reappearing on articles.
    assert.doesNotMatch(policyMatch[0], /\bor\b/i);
    assert.match(policyMatch[0], /auth\.uid\(\)::text = authorUid/i);
  }
});

test("updatedAt trigger keeps the touch function in sync on every update", () => {
  const sql = readSql();
  assert.match(sql, /create trigger articles_touch_updatedat/i);
  assert.match(sql, /before update on public\.articles/i);
});

test("increment_article_view is SECURITY DEFINER, only touches viewCount, and only on published rows", () => {
  const sql = readSql();
  const fnMatch = sql.match(
    /create or replace function public\.increment_article_view\(p_article_id text\)([\s\S]*?)\$\$;/i
  );
  assert.ok(fnMatch, "expected to find increment_article_view");
  assert.match(fnMatch[1], /security definer/i);
  assert.match(fnMatch[1], /set viewCount = viewCount \+ 1/i);
  assert.match(fnMatch[1], /where id = p_article_id and status = 'published'/i);
  assert.match(sql, /grant execute on function public\.increment_article_view\(text\) to anon, authenticated/i);
});
