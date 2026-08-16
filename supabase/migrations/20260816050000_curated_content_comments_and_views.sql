-- View count: a plain column update from authenticated/anon clients isn't
-- possible (curated_content only grants insert/update to service_role — see
-- its own migration), so a security-definer RPC is the same pattern already
-- used elsewhere in this schema for "let any visitor do one narrow,
-- specific write without granting broad table access".
alter table public.curated_content
  add column if not exists view_count integer not null default 0;

create or replace function public.increment_curated_content_view(p_content_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.curated_content set view_count = view_count + 1 where id = p_content_id;
$$;

grant execute on function public.increment_curated_content_view(uuid) to authenticated, anon;

-- Comments: parallel to curated_content_reactions (20260816030000) — same
-- reasoning for not reusing posts' Firestore-shim comment system, which
-- assumes a post document shape these rows don't have.
create table if not exists public.curated_content_comments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.curated_content(id) on delete cascade,
  uid text not null references public.users(uid) on delete cascade,
  body text not null,
  createdat timestamptz not null default now()
);

create index if not exists curated_content_comments_content_id_idx
  on public.curated_content_comments (content_id);

alter table public.curated_content_comments enable row level security;

grant select, insert, delete on public.curated_content_comments to authenticated;
grant select on public.curated_content_comments to anon;
grant select, insert, update, delete on public.curated_content_comments to service_role;

drop policy if exists "curated_content_comments_select_all" on public.curated_content_comments;
create policy "curated_content_comments_select_all"
on public.curated_content_comments
for select
using (true);

drop policy if exists "curated_content_comments_insert_own" on public.curated_content_comments;
create policy "curated_content_comments_insert_own"
on public.curated_content_comments
for insert
to authenticated
with check (auth.uid()::text = uid);

drop policy if exists "curated_content_comments_delete_own" on public.curated_content_comments;
create policy "curated_content_comments_delete_own"
on public.curated_content_comments
for delete
to authenticated
using (auth.uid()::text = uid);
