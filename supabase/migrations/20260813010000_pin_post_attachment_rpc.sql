-- Files are no longer a separate upload flow — an admin "pins" an existing
-- group post's attachment to feature it in the Files tab instead. That
-- means the group_files row being created is attributed to the ORIGINAL
-- poster (uploaderuid), not the admin doing the pinning — which the
-- existing group_files_insert_members policy (auth.uid() = uploaderuid)
-- would block, since the admin isn't that uploader. Security definer RPC
-- verifies admin status itself and upserts on behalf of the real uploader.
alter table public.group_files
  drop constraint if exists group_files_groupid_url_key;
alter table public.group_files
  add constraint group_files_groupid_url_key unique (groupid, url);

create or replace function public.pin_group_post_attachment(
  p_group_id text,
  p_url text,
  p_name text,
  p_file_type text,
  p_uploader_uid text
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
  select exists (
    select 1 from public.group_members
    where groupid = p_group_id and uid = v_caller_uid and role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'Only admins can pin files';
  end if;

  insert into public.group_files (id, groupid, uploaderuid, name, url, filetype, ispinned)
  values (gen_random_uuid()::text, p_group_id, p_uploader_uid, p_name, p_url, p_file_type, true)
  on conflict (groupid, url) do update set ispinned = true;
end;
$$;

grant execute on function public.pin_group_post_attachment(text, text, text, text, text) to authenticated;
