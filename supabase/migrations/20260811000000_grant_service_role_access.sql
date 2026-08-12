-- service_role is meant to have unrestricted admin access for server-side
-- code (background jobs, admin operations, post-job triggers — see
-- lib/supabase/post-jobs.mjs and lib/supabase/admin.ts). Row Level Security
-- does not block it (Supabase's service_role bypasses RLS at the Postgres
-- role level), but that only matters once a base table grant exists. These
-- tables were created by a hand-written migration outside Supabase's normal
-- dashboard-driven flow, so the platform's automatic default privileges for
-- service_role never applied to them, leaving it with no grant at all.
grant select, insert, update, delete on
  public.users,
  public.posts,
  public.conversations,
  public.messages,
  public.notifications,
  public.user_relationships,
  public.post_engagements,
  public.user_meta
to service_role;
