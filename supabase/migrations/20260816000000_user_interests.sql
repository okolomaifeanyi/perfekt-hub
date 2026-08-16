-- What a user wants to see in the Aside curated-content rails and as the
-- /updates page's default filters. A single namespaced text key rather than
-- separate league/topic columns — "league:PL", "topic:tech_news" — keeps one
-- simple table instead of two near-identical ones, and stays open to new
-- namespaces later without a schema change.
create table if not exists public.user_interests (
  uid text not null references public.users(uid) on delete cascade,
  interest_key text not null,
  createdat timestamptz not null default now(),
  primary key (uid, interest_key)
);

alter table public.user_interests enable row level security;

grant select, insert, delete on public.user_interests to authenticated;
grant select, insert, update, delete on public.user_interests to service_role;

-- No update policy — interests are toggled by inserting/deleting rows, not
-- editing existing ones, same as saved_posts.

drop policy if exists "user_interests_owner_only" on public.user_interests;
create policy "user_interests_owner_only"
on public.user_interests
for select
to authenticated
using (auth.uid()::text = uid);

drop policy if exists "user_interests_insert_own" on public.user_interests;
create policy "user_interests_insert_own"
on public.user_interests
for insert
to authenticated
with check (auth.uid()::text = uid);

drop policy if exists "user_interests_delete_own" on public.user_interests;
create policy "user_interests_delete_own"
on public.user_interests
for delete
to authenticated
using (auth.uid()::text = uid);
