-- Group roles: WhatsApp-style admin management. The group creator becomes
-- the first admin; admins (not just the original owner) can promote/demote
-- other members, remove members, and edit group settings.
alter table public.group_members
  add column if not exists role text not null default 'member' check (role in ('admin', 'member'));

update public.group_members gm
set role = 'admin'
from public.groups g
where g.id = gm.groupid and g.owneruid = gm.uid and gm.role <> 'admin';

grant update on public.group_members to authenticated;

drop policy if exists "group_members_admin_delete" on public.group_members;
create policy "group_members_admin_delete"
on public.group_members
for delete
to authenticated
using (
  exists (
    select 1 from public.group_members admin_row
    where admin_row.groupid = group_members.groupid
      and admin_row.uid = auth.uid()::text
      and admin_row.role = 'admin'
  )
);

drop policy if exists "group_members_admin_update_role" on public.group_members;
create policy "group_members_admin_update_role"
on public.group_members
for update
to authenticated
using (
  exists (
    select 1 from public.group_members admin_row
    where admin_row.groupid = group_members.groupid
      and admin_row.uid = auth.uid()::text
      and admin_row.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.group_members admin_row
    where admin_row.groupid = group_members.groupid
      and admin_row.uid = auth.uid()::text
      and admin_row.role = 'admin'
  )
);

-- Group settings (name/description/photo) editable by any admin, not just
-- the original creator, and deletable by any admin too.
drop policy if exists "groups_update_admin" on public.groups;
create policy "groups_update_admin"
on public.groups
for update
to authenticated
using (
  exists (
    select 1 from public.group_members gm
    where gm.groupid = groups.id and gm.uid = auth.uid()::text and gm.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.group_members gm
    where gm.groupid = groups.id and gm.uid = auth.uid()::text and gm.role = 'admin'
  )
);

drop policy if exists "groups_delete_admin" on public.groups;
create policy "groups_delete_admin"
on public.groups
for delete
to authenticated
using (
  exists (
    select 1 from public.group_members gm
    where gm.groupid = groups.id and gm.uid = auth.uid()::text and gm.role = 'admin'
  )
);

-- Polls
create table if not exists public.group_polls (
  id text primary key,
  groupid text not null references public.groups(id) on delete cascade,
  question text not null,
  anonymous boolean not null default false,
  createdby text not null references public.users(uid) on delete cascade,
  createdat timestamptz not null default now(),
  closed boolean not null default false
);

create table if not exists public.group_poll_options (
  id text primary key,
  pollid text not null references public.group_polls(id) on delete cascade,
  label text not null,
  position integer not null default 0
);

create table if not exists public.group_poll_votes (
  id text primary key,
  pollid text not null references public.group_polls(id) on delete cascade,
  optionid text not null references public.group_poll_options(id) on delete cascade,
  uid text not null references public.users(uid) on delete cascade,
  createdat timestamptz not null default now(),
  unique (pollid, uid)
);

create index if not exists group_polls_groupid_idx on public.group_polls (groupid);
create index if not exists group_poll_options_pollid_idx on public.group_poll_options (pollid);
create index if not exists group_poll_votes_pollid_idx on public.group_poll_votes (pollid);

alter table public.group_polls enable row level security;
alter table public.group_poll_options enable row level security;
alter table public.group_poll_votes enable row level security;

grant select, insert, update on public.group_polls to authenticated;
grant select, insert on public.group_poll_options to authenticated;
grant select, insert, delete on public.group_poll_votes to authenticated;
grant select, insert, update, delete on public.group_polls to service_role;
grant select, insert, update, delete on public.group_poll_options to service_role;
grant select, insert, update, delete on public.group_poll_votes to service_role;

drop policy if exists "group_polls_member_select" on public.group_polls;
create policy "group_polls_member_select" on public.group_polls for select to authenticated
  using (exists (select 1 from public.group_members gm where gm.groupid = group_polls.groupid and gm.uid = auth.uid()::text));

drop policy if exists "group_polls_member_insert" on public.group_polls;
create policy "group_polls_member_insert" on public.group_polls for insert to authenticated
  with check (
    auth.uid()::text = createdby
    and exists (select 1 from public.group_members gm where gm.groupid = group_polls.groupid and gm.uid = auth.uid()::text)
  );

drop policy if exists "group_polls_creator_or_admin_update" on public.group_polls;
create policy "group_polls_creator_or_admin_update" on public.group_polls for update to authenticated
  using (
    auth.uid()::text = createdby
    or exists (select 1 from public.group_members gm where gm.groupid = group_polls.groupid and gm.uid = auth.uid()::text and gm.role = 'admin')
  )
  with check (
    auth.uid()::text = createdby
    or exists (select 1 from public.group_members gm where gm.groupid = group_polls.groupid and gm.uid = auth.uid()::text and gm.role = 'admin')
  );

drop policy if exists "group_poll_options_member_select" on public.group_poll_options;
create policy "group_poll_options_member_select" on public.group_poll_options for select to authenticated
  using (exists (
    select 1 from public.group_polls p
    join public.group_members gm on gm.groupid = p.groupid
    where p.id = group_poll_options.pollid and gm.uid = auth.uid()::text
  ));

drop policy if exists "group_poll_options_creator_insert" on public.group_poll_options;
create policy "group_poll_options_creator_insert" on public.group_poll_options for insert to authenticated
  with check (exists (
    select 1 from public.group_polls p
    where p.id = group_poll_options.pollid and p.createdby = auth.uid()::text
  ));

-- Votes: a member can only see/insert/delete their OWN vote row, never
-- anyone else's — no policy here ever grants visibility into another
-- member's choice, anonymous poll or not. That's what actually makes a
-- poll anonymous: aggregate counts are exposed separately below via a
-- security-definer RPC that returns option_id + vote_count only, never a
-- voter list.
drop policy if exists "group_poll_votes_own_select" on public.group_poll_votes;
create policy "group_poll_votes_own_select" on public.group_poll_votes for select to authenticated
  using (auth.uid()::text = uid);

drop policy if exists "group_poll_votes_own_insert" on public.group_poll_votes;
create policy "group_poll_votes_own_insert" on public.group_poll_votes for insert to authenticated
  with check (
    auth.uid()::text = uid
    and exists (
      select 1 from public.group_polls p
      join public.group_members gm on gm.groupid = p.groupid
      where p.id = group_poll_votes.pollid and gm.uid = auth.uid()::text and not p.closed
    )
  );

drop policy if exists "group_poll_votes_own_delete" on public.group_poll_votes;
create policy "group_poll_votes_own_delete" on public.group_poll_votes for delete to authenticated
  using (auth.uid()::text = uid);

create or replace function public.get_poll_results(poll_id text)
returns table (optionid text, vote_count bigint)
language sql
security definer
set search_path = public
as $$
  select o.id as optionid, count(v.id) as vote_count
  from public.group_poll_options o
  left join public.group_poll_votes v on v.optionid = o.id
  where o.pollid = poll_id
    and exists (
      select 1
      from public.group_polls p
      join public.group_members gm on gm.groupid = p.groupid
      where p.id = poll_id and gm.uid = auth.uid()::text
    )
  group by o.id;
$$;

grant execute on function public.get_poll_results(text) to authenticated;

create or replace function public.get_my_poll_vote(poll_id text)
returns table (optionid text)
language sql
security definer
set search_path = public
as $$
  select optionid from public.group_poll_votes
  where pollid = poll_id and uid = auth.uid()::text
  limit 1;
$$;

grant execute on function public.get_my_poll_vote(text) to authenticated;
