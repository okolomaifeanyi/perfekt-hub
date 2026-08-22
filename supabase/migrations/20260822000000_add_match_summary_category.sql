-- AI-generated post-match recap for a finished result, grounded in the
-- final score plus goals/cards from football-data.org where available, and
-- (when one exists) the pre-match match_analysis prediction for the same
-- fixture (see lib/cron/ingest/match-summary.mjs) — distinct from
-- match_analysis, which is written before kickoff and never updated once
-- the match finishes.
alter table public.curated_content
  drop constraint curated_content_category_check;

alter table public.curated_content
  add constraint curated_content_category_check
  check (category in (
    'football_fixture',
    'football_live',
    'football_result',
    'football_news',
    'crypto_price',
    'crypto_news',
    'betting_prediction',
    'movie_news',
    'music_news',
    'gossip_news',
    'video_trending',
    'education_news',
    'tech_news',
    'fraud_alert',
    'match_analysis',
    'match_summary'
  ));
