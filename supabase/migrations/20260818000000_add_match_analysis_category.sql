-- AI-generated pre-match analysis, grounded in real recent form and
-- head-to-head history from football-data.org (see
-- lib/cron/ingest/match-analysis.mjs) plus the existing odds-based
-- prediction — distinct from betting_prediction, which is just the raw
-- odds-implied pick with no written analysis.
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
    'match_analysis'
  ));
