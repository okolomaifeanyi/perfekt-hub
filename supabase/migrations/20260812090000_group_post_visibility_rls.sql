-- posts_read_all was `using (true)` for anon AND authenticated — every post
-- was fully readable by anyone regardless of the visibility/groupid columns
-- added in 20260812040000. Confirmed live: a group post marked
-- visibility = 'private' was still returned by a plain anon REST call.
-- listGroupPosts()'s membership filter was only ever an application-layer
-- nicety, never actually enforced.
--
-- Also implements the two-tier gate: a post only counts as public to
-- non-members when BOTH the post's own visibility is 'public' AND the
-- group's admin-controlled defaultpostvisibility is 'public' — an
-- individual member setting their post to "public" doesn't do anything
-- if the group admin has the group set to private by default. Group
-- members can always see every post in their own group regardless of
-- either flag; the flags only gate outsider visibility.
drop policy if exists "posts_read_all" on public.posts;
create policy "posts_read_all"
on public.posts
for select
to anon, authenticated
using (
  groupid is null
  or (
    visibility = 'public'
    and exists (
      select 1 from public.groups g
      where g.id = posts.groupid and g.defaultpostvisibility = 'public'
    )
  )
  or exists (
    select 1 from public.group_members gm
    where gm.groupid = posts.groupid and gm.uid = auth.uid()::text
  )
);
