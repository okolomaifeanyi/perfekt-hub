-- Admin-approve join request: inserts a group_members row on behalf of
-- another user. The existing RLS policy "group_members_insert_own" only
-- allows each user to insert their own row (auth.uid() = uid). A group
-- admin inserting a row for the *applicant* bypasses that check, so we
-- need a security-definer function that validates admin status itself.
create or replace function public.approve_group_join_request(
  p_group_id text,
  p_request_uid text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_uid text := auth.uid()::text;
  v_is_admin boolean;
begin
  -- Verify caller is an admin of the group
  select exists (
    select 1 from public.group_members
    where groupid = p_group_id
      and uid = v_caller_uid
      and role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'Only admins can approve join requests';
  end if;

  -- Insert the new member (idempotent via ON CONFLICT DO NOTHING)
  insert into public.group_members (id, groupid, uid, role)
  values (gen_random_uuid()::text, p_group_id, p_request_uid, 'member')
  on conflict (groupid, uid) do nothing;

  -- Remove the pending request
  delete from public.group_join_requests
  where groupid = p_group_id and uid = p_request_uid;

  -- Sync members count
  update public.groups
  set memberscount = (
    select count(*) from public.group_members where groupid = p_group_id
  )
  where id = p_group_id;
end;
$$;

grant execute on function public.approve_group_join_request(text, text) to authenticated;
