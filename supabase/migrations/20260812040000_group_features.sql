-- Group feature additions:
-- 1. Wall image, join policy, and online presence fields on groups
-- 2. Group posts (reuse posts table with groupId + visibility)
-- 3. Group files table
-- 4. Join request table for admin-acceptance groups

-- 1. Add columns to groups table
alter table public.groups
  add column if not exists wallurl text,
  add column if not exists joinpolicy text not null default 'open' check (joinpolicy in ('open', 'admin')),
  add column if not exists pinned_post_id text;

-- 2. Add groupId, visibility, isPinned to posts (group posts)
alter table public.posts
  add column if not exists groupid text references public.groups(id) on delete cascade,
  add column if not exists visibility text not null default 'public' check (visibility in ('public', 'private')),
  add column if not exists ispinned boolean not null default false;

create index if not exists posts_groupid_idx on public.posts (groupid);

-- 3. Group files table
create table if not exists public.group_files (
  id text primary key,
  groupid text not null references public.groups(id) on delete cascade,
  uploaderuid text not null references public.users(uid) on delete cascade,
  name text not null,
  url text not null,
  filetype text not null default 'file' check (filetype in ('image', 'video', 'pdf', 'file')),
  size bigint not null default 0,
  ispinned boolean not null default false,
  createdat timestamptz not null default now()
);

create index if not exists group_files_groupid_idx on public.group_files (groupid);

alter table public.group_files enable row level security;
grant select, insert, update, delete on public.group_files to authenticated;
grant select, insert, update, delete on public.group_files to service_role;

drop policy if exists "group_files_read_members" on public.group_files;
create policy "group_files_read_members"
on public.group_files for select to authenticated
using (
  exists (
    select 1 from public.group_members gm
    where gm.groupid = group_files.groupid and gm.uid = auth.uid()::text
  )
);

drop policy if exists "group_files_insert_members" on public.group_files;
create policy "group_files_insert_members"
on public.group_files for insert to authenticated
with check (
  auth.uid()::text = uploaderuid and
  exists (
    select 1 from public.group_members gm
    where gm.groupid = group_files.groupid and gm.uid = auth.uid()::text
  )
);

drop policy if exists "group_files_update_admin" on public.group_files;
create policy "group_files_update_admin"
on public.group_files for update to authenticated
using (
  exists (
    select 1 from public.group_members gm
    where gm.groupid = group_files.groupid and gm.uid = auth.uid()::text and gm.role = 'admin'
  )
);

drop policy if exists "group_files_delete_admin_or_owner" on public.group_files;
create policy "group_files_delete_admin_or_owner"
on public.group_files for delete to authenticated
using (
  auth.uid()::text = uploaderuid or
  exists (
    select 1 from public.group_members gm
    where gm.groupid = group_files.groupid and gm.uid = auth.uid()::text and gm.role = 'admin'
  )
);

-- 4. Group join requests (for admin-acceptance groups)
create table if not exists public.group_join_requests (
  id text primary key,
  groupid text not null references public.groups(id) on delete cascade,
  uid text not null references public.users(uid) on delete cascade,
  requestedat timestamptz not null default now(),
  unique (groupid, uid)
);

alter table public.group_join_requests enable row level security;
grant select, insert, delete on public.group_join_requests to authenticated;
grant select, insert, update, delete on public.group_join_requests to service_role;

drop policy if exists "join_requests_read_admin" on public.group_join_requests;
create policy "join_requests_read_admin"
on public.group_join_requests for select to authenticated
using (
  auth.uid()::text = uid or
  exists (
    select 1 from public.group_members gm
    where gm.groupid = group_join_requests.groupid and gm.uid = auth.uid()::text and gm.role = 'admin'
  )
);

drop policy if exists "join_requests_insert_own" on public.group_join_requests;
create policy "join_requests_insert_own"
on public.group_join_requests for insert to authenticated
with check (auth.uid()::text = uid);

drop policy if exists "join_requests_delete_admin_or_own" on public.group_join_requests;
create policy "join_requests_delete_admin_or_own"
on public.group_join_requests for delete to authenticated
using (
  auth.uid()::text = uid or
  exists (
    select 1 from public.group_members gm
    where gm.groupid = group_join_requests.groupid and gm.uid = auth.uid()::text and gm.role = 'admin'
  )
);
