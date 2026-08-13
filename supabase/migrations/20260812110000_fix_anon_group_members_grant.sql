-- Same class of issue as 20260812100000, one table over: posts_read_all's
-- second exists() clause checks public.group_members for the caller's
-- membership, and anon never had a grant there either — group_members_read_all
-- is already `using (true)` for authenticated (membership rows were already
-- treated as non-sensitive, publicly-listable info in this app's existing
-- design), so extending that same read access to anon is consistent, not a
-- new precedent, and is what the posts RLS policy needs to evaluate cleanly
-- for logged-out callers instead of erroring on every query that touches a
-- group post.
grant select on public.group_members to anon;

drop policy if exists "group_members_read_all_anon" on public.group_members;
create policy "group_members_read_all_anon"
on public.group_members
for select
to anon
using (true);
