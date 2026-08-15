-- /api/cron/football only exports a GET handler (matching how Vercel Cron
-- itself calls cron routes), but the previous migration scheduled pg_net
-- with net.http_post — every scheduled run was hitting a 405 Method Not
-- Allowed instead of actually running the ingestion (confirmed live: a
-- manual net.http_post call against the deployed route came back
-- status_code 405). Switching to net.http_get fixes it.
select cron.unschedule('football-live-scores')
where exists (select 1 from cron.job where jobname = 'football-live-scores');

select cron.schedule(
  'football-live-scores',
  '*/2 * * * *',
  $$
  select net.http_get(
    url := 'https://perfekthub.vercel.app/api/cron/football',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'cron_secret'
      )
    )
  );
  $$
);
