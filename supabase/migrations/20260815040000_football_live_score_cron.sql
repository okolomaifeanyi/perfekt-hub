-- Fast-cadence polling for live football scores. Vercel Cron (Hobby plan)
-- caps every job at once/day, which is fine for the slow categories
-- (crypto/betting/movies/videos/news, scheduled in vercel.json) but useless
-- for scores that need to move every couple of minutes — pg_cron polls
-- Postgres-side instead via pg_net, no extra scheduling platform needed.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- The actual CRON_SECRET value is never written into a migration file (that
-- would commit a live secret to git) — it's stored in Supabase Vault via a
-- one-off `select vault.create_secret(...)` run directly against the
-- database, outside of migrations, the same reasoning as why .env.local
-- itself isn't committed. This job looks it up by name at call time.
--
-- Football-data.org's free tier caps at 10 req/min; this job makes 5
-- requests per run (one per league), so a 2-minute interval averages 2.5
-- req/min — comfortably under the cap running continuously, not just
-- during matches, so there's no need to detect "is a match live" first.
select cron.unschedule('football-live-scores')
where exists (select 1 from cron.job where jobname = 'football-live-scores');

select cron.schedule(
  'football-live-scores',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := 'https://perfekthub.vercel.app/api/cron/football',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'cron_secret'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
