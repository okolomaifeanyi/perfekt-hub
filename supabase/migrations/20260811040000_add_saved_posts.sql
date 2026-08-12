-- "Saved posts" has a visible "Saved" tab on the profile page and a
-- SavedPostsGrid component, but no real table ever backed it and there was
-- no way to save a post in the first place. This adds the missing table and
-- restricts it to the owning user only (never anon, never other users).
create table if not exists public.saved_posts (
  id text primary key,
  uid text not null references public.users(uid) on delete cascade,
  postid text not null references public.posts(id) on delete cascade,
  createdat timestamptz not null default now(),
  unique (uid, postid)
);

create index if not exists saved_posts_uid_createdat_idx on public.saved_posts (uid, createdat desc);

alter table public.saved_posts enable row level security;

grant select, insert, delete on public.saved_posts to authenticated;
grant select, insert, update, delete on public.saved_posts to service_role;

drop policy if exists "saved_posts_owner_only" on public.saved_posts;
create policy "saved_posts_owner_only"
on public.saved_posts
for select
to authenticated
using (auth.uid()::text = uid);

drop policy if exists "saved_posts_insert_own" on public.saved_posts;
create policy "saved_posts_insert_own"
on public.saved_posts
for insert
to authenticated
with check (auth.uid()::text = uid);

drop policy if exists "saved_posts_delete_own" on public.saved_posts;
create policy "saved_posts_delete_own"
on public.saved_posts
for delete
to authenticated
using (auth.uid()::text = uid);
