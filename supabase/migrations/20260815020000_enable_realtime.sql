-- onSnapshot() (lib/shims/firestore-core.ts) polled every listener's query
-- on an unconditional 3s timer — every mounted messages/notifications/
-- conversations/presence/comments listener across the whole app, all the
-- time, whether or not anything had actually changed. Enabling Postgres
-- replication lets that listener wake up on an actual change instead,
-- keeping a much slower interval (see the shim) purely as a safety net for
-- a missed/dropped realtime event rather than as the primary mechanism.
--
-- Idempotent: adding a table already in the publication throws, so each
-- is guarded by a lookup against pg_publication_tables first.
do $$
declare
  t text;
begin
  foreach t in array array[
    'users',
    'posts',
    'post_engagements',
    'conversations',
    'messages',
    'notifications',
    'user_meta',
    'saved_posts',
    'user_relationships'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
