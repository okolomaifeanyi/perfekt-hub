-- Long-form articles ("Compose Article") — a distinct content type from
-- short posts (public.posts), not an extension of it, so drafts, a
-- per-author slug, and a much longer markdown body don't have to be bolted
-- onto the posts schema. Any signed-in user can write one; anon and
-- authenticated visitors alike can read a published article, same
-- visibility shape as posts (see posts_read_all in
-- 20260812090000_group_post_visibility_rls.sql) — a draft is visible only
-- to its own author.
create table if not exists public.articles (
  id text primary key,
  authorUid text not null references public.users(uid) on delete cascade,
  authorUsername text not null,
  title text not null,
  slug text not null,
  excerpt text not null default '',
  body text not null default '',
  coverImageUrl text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  readingMinutes integer not null default 1,
  viewCount integer not null default 0,
  publishedAt timestamptz,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);

-- Slugs only need to be unique within one author's own articles, not
-- globally — the detail route is /articles/[username]/[slug], already
-- namespaced by username, so two different authors can each have a
-- "getting-started" article without either needing a random suffix.
create unique index if not exists articles_author_slug_idx
  on public.articles (authorUid, slug);

-- Powers both the /articles listing (published, newest first) and the
-- sitemap's article entries.
create index if not exists articles_published_idx
  on public.articles (publishedAt desc)
  where status = 'published';

-- Powers "my articles" (an author's own drafts + published, newest first).
create index if not exists articles_author_status_idx
  on public.articles (authorUid, status, createdAt desc);

alter table public.articles enable row level security;

grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;
grant select, insert, update, delete on public.articles to service_role;

-- Published articles are world-readable, including for signed-out
-- visitors; a draft is readable only by its own author. Two-tier shape
-- deliberately mirrors posts_read_all's group-post visibility policy,
-- just author-scoped instead of group-membership-scoped.
drop policy if exists "articles_read_published_or_own" on public.articles;
create policy "articles_read_published_or_own"
on public.articles
for select
to anon, authenticated
using (
  status = 'published'
  or auth.uid()::text = authorUid
);

drop policy if exists "articles_author_insert" on public.articles;
create policy "articles_author_insert"
on public.articles
for insert
to authenticated
with check (auth.uid()::text = authorUid);

-- Update and delete are each scoped to the article's own author only — no
-- "or" clause granting any other participant edit/delete rights (see
-- 20260822010000_fix_messages_update_delete_policies.sql for what that
-- mistake looks like on another table).
drop policy if exists "articles_author_update" on public.articles;
create policy "articles_author_update"
on public.articles
for update
to authenticated
using (auth.uid()::text = authorUid)
with check (auth.uid()::text = authorUid);

drop policy if exists "articles_author_delete" on public.articles;
create policy "articles_author_delete"
on public.articles
for delete
to authenticated
using (auth.uid()::text = authorUid);

create or replace function public.touch_articles_updatedat()
returns trigger
language plpgsql
as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;

drop trigger if exists articles_touch_updatedat on public.articles;
create trigger articles_touch_updatedat
  before update on public.articles
  for each row
  execute function public.touch_articles_updatedat();

-- View counts increment via this SECURITY DEFINER RPC rather than a direct
-- UPDATE grant to anon/authenticated: the update policy above is
-- author-only, so without this a reader viewing someone else's published
-- article would have no way to bump its view count at all. Scoped
-- narrowly on purpose — it only ever touches viewCount, and only on a row
-- that is already published, so it can't be used to modify article
-- content or to leak/resurrect a draft.
create or replace function public.increment_article_view(p_article_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.articles
  set viewCount = viewCount + 1
  where id = p_article_id and status = 'published';
end;
$$;

revoke all on function public.increment_article_view(text) from public;
grant execute on function public.increment_article_view(text) to anon, authenticated;
