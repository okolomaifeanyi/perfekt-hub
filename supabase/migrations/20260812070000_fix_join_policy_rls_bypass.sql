-- joinGroup() in application code correctly routes "admin approval
-- required" groups through group_join_requests instead of inserting
-- directly into group_members, but that routing was only enforced in
-- application code. The group_members_insert_own policy only checked
-- auth.uid()::text = uid — nothing stopped a direct API call from
-- inserting straight into group_members for a group whose joinpolicy is
-- 'admin', completely bypassing approval.
--
-- approve_group_join_request() (20260812050000) still works fine after
-- this change: it's SECURITY DEFINER and none of these tables have FORCE
-- ROW LEVEL SECURITY set, so the function's owner bypasses RLS on its
-- internal insert regardless of this policy.
drop policy if exists "group_members_insert_own" on public.group_members;
create policy "group_members_insert_own"
on public.group_members
for insert
to authenticated
with check (
  auth.uid()::text = uid
  and exists (
    select 1 from public.groups g
    where g.id = group_members.groupid and g.joinpolicy = 'open'
  )
);
