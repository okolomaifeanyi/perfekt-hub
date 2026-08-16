-- Like/dislike on curated_content rows (news, scores, betting picks, etc.),
-- parallel to but deliberately separate from posts' reaction system — posts'
-- engagements live under the Firestore-shim "posts" collection keyed by a
-- postId that assumes a post document with a userId/reactionCounts shape,
-- none of which curated_content rows have. A plain table + live COUNT is
-- simpler and fits the much smaller expected reaction volume here.
create table if not exists public.curated_content_reactions (
  content_id uuid not null references public.curated_content(id) on delete cascade,
  uid text not null references public.users(uid) on delete cascade,
  type text not null check (type in ('like', 'dislike')),
  createdat timestamptz not null default now(),
  primary key (content_id, uid)
);

create index if not exists curated_content_reactions_content_id_idx
  on public.curated_content_reactions (content_id);

alter table public.curated_content_reactions enable row level security;

grant select, insert, update, delete on public.curated_content_reactions to authenticated;
grant select on public.curated_content_reactions to anon;
grant select, insert, update, delete on public.curated_content_reactions to service_role;

-- Counts are public (same visibility as curated_content itself — even
-- signed-out visitors can browse /updates and Discover) — only the owner
-- row can be written, and switching like<->dislike updates the row in
-- place instead of a delete+insert, unlike user_interests' insert/delete
-- pattern, since there's no "namespaced key" collision risk here.
drop policy if exists "curated_content_reactions_select_all" on public.curated_content_reactions;
create policy "curated_content_reactions_select_all"
on public.curated_content_reactions
for select
using (true);

drop policy if exists "curated_content_reactions_insert_own" on public.curated_content_reactions;
create policy "curated_content_reactions_insert_own"
on public.curated_content_reactions
for insert
to authenticated
with check (auth.uid()::text = uid);

drop policy if exists "curated_content_reactions_update_own" on public.curated_content_reactions;
create policy "curated_content_reactions_update_own"
on public.curated_content_reactions
for update
to authenticated
using (auth.uid()::text = uid)
with check (auth.uid()::text = uid);

drop policy if exists "curated_content_reactions_delete_own" on public.curated_content_reactions;
create policy "curated_content_reactions_delete_own"
on public.curated_content_reactions
for delete
to authenticated
using (auth.uid()::text = uid);
