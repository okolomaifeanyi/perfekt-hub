-- The posts_read_all policy just added (20260812090000) references
-- public.groups in a subquery to check defaultpostvisibility. RLS
-- subqueries run under the CALLING role's privileges, and anon never had
-- a grant on groups — so evaluating that policy for any row touching a
-- group post failed outright for anon callers (42501 permission denied
-- for table groups) instead of just excluding the row. That broke every
-- posts query for logged-out users the moment a group post existed in
-- the result set, not just group post visibility specifically.
--
-- Group metadata (name/description/member count/join policy) isn't
-- sensitive — groups_read_all already makes it fully public to any
-- authenticated user — so extending that to anon closes the gap.
grant select on public.groups to anon;

drop policy if exists "groups_read_all_anon" on public.groups;
create policy "groups_read_all_anon"
on public.groups
for select
to anon
using (true);
