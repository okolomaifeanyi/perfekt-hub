-- The "users_read_all" policy (see 20260530000000_init.sql) grants the anon
-- role row-level access to every column of public.users, including email,
-- phonenumber, dob, and gender. Since RLS is row-level (not column-level),
-- this lets anyone with the public anon key read every user's PII directly
-- via the PostgREST API, with no login required.
--
-- The only legitimate anonymous use cases (username-availability and
-- email-by-username lookups during signup/login) already have dedicated
-- security-definer RPCs granted to anon in 20260606000001_user_profile_rpc.sql
-- (generate_unique_username, lookup_user_email_by_username). Those bypass RLS
-- via their function owner's privileges, so they keep working once direct
-- table access is revoked.
drop policy if exists "users_read_all" on public.users;

create policy "users_read_authenticated"
on public.users
for select
to authenticated
using (true);

revoke select on public.users from anon;
