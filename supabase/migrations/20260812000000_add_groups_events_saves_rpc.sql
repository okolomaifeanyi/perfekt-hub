-- Real backing for the Discover rails that were previously fake promo cards
-- with no data behind them: Top Saves, Groups, Events. (Suggested Match
-- reuses the existing users table, no new schema needed.)

-- Top Saves: how many times each post has been saved, across all users.
-- saved_posts RLS only lets each user see their own rows, so a plain view
-- would only ever aggregate the querying user's own saves. This needs
-- security definer to count everyone's, which is fine to expose — "N people
-- saved this" is not a privacy leak, unlike *who* saved it.
create or replace function public.get_top_saved_posts(result_limit int default 10)
returns table (postid text, save_count bigint)
language sql
security definer
set search_path = public
as $$
  select postid, count(*) as save_count
  from public.saved_posts
  group by postid
  order by save_count desc
  limit result_limit;
$$;

grant execute on function public.get_top_saved_posts(int) to authenticated;

-- Groups
create table if not exists public.groups (
  id text primary key,
  name text not null,
  description text not null default '',
  photourl text,
  owneruid text not null references public.users(uid) on delete cascade,
  memberscount integer not null default 1,
  createdat timestamptz not null default now()
);

create table if not exists public.group_members (
  id text primary key,
  groupid text not null references public.groups(id) on delete cascade,
  uid text not null references public.users(uid) on delete cascade,
  joinedat timestamptz not null default now(),
  unique (groupid, uid)
);

create index if not exists group_members_uid_idx on public.group_members (uid);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.groups to service_role;
grant select, insert, update, delete on public.group_members to service_role;

drop policy if exists "groups_read_all" on public.groups;
create policy "groups_read_all" on public.groups for select to authenticated using (true);

drop policy if exists "groups_insert_own" on public.groups;
create policy "groups_insert_own" on public.groups for insert to authenticated
  with check (auth.uid()::text = owneruid);

drop policy if exists "groups_update_owner" on public.groups;
create policy "groups_update_owner" on public.groups for update to authenticated
  using (auth.uid()::text = owneruid) with check (auth.uid()::text = owneruid);

drop policy if exists "groups_delete_owner" on public.groups;
create policy "groups_delete_owner" on public.groups for delete to authenticated
  using (auth.uid()::text = owneruid);

drop policy if exists "group_members_read_all" on public.group_members;
create policy "group_members_read_all" on public.group_members for select to authenticated using (true);

drop policy if exists "group_members_insert_own" on public.group_members;
create policy "group_members_insert_own" on public.group_members for insert to authenticated
  with check (auth.uid()::text = uid);

drop policy if exists "group_members_delete_own" on public.group_members;
create policy "group_members_delete_own" on public.group_members for delete to authenticated
  using (auth.uid()::text = uid);

-- Events
create table if not exists public.events (
  id text primary key,
  title text not null,
  description text not null default '',
  location text not null default '',
  starttime timestamptz not null,
  isprivate boolean not null default false,
  owneruid text not null references public.users(uid) on delete cascade,
  attendeescount integer not null default 1,
  createdat timestamptz not null default now()
);

create table if not exists public.event_rsvps (
  id text primary key,
  eventid text not null references public.events(id) on delete cascade,
  uid text not null references public.users(uid) on delete cascade,
  rsvpat timestamptz not null default now(),
  unique (eventid, uid)
);

create index if not exists event_rsvps_uid_idx on public.event_rsvps (uid);
create index if not exists events_starttime_idx on public.events (starttime);

alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;

grant select, insert, update, delete on public.events to authenticated;
grant select, insert, delete on public.event_rsvps to authenticated;
grant select, insert, update, delete on public.events to service_role;
grant select, insert, update, delete on public.event_rsvps to service_role;

drop policy if exists "events_read_public_or_own" on public.events;
create policy "events_read_public_or_own" on public.events for select to authenticated
  using (not isprivate or auth.uid()::text = owneruid);

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own" on public.events for insert to authenticated
  with check (auth.uid()::text = owneruid);

drop policy if exists "events_update_owner" on public.events;
create policy "events_update_owner" on public.events for update to authenticated
  using (auth.uid()::text = owneruid) with check (auth.uid()::text = owneruid);

drop policy if exists "events_delete_owner" on public.events;
create policy "events_delete_owner" on public.events for delete to authenticated
  using (auth.uid()::text = owneruid);

drop policy if exists "event_rsvps_read_all" on public.event_rsvps;
create policy "event_rsvps_read_all" on public.event_rsvps for select to authenticated using (true);

drop policy if exists "event_rsvps_insert_own" on public.event_rsvps;
create policy "event_rsvps_insert_own" on public.event_rsvps for insert to authenticated
  with check (auth.uid()::text = uid);

drop policy if exists "event_rsvps_delete_own" on public.event_rsvps;
create policy "event_rsvps_delete_own" on public.event_rsvps for delete to authenticated
  using (auth.uid()::text = uid);
