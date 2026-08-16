-- Football scores/fixtures/results already exist, but there was no category
-- for football/soccer journalism (transfers, previews, analysis) — the kind
-- of content NewsData.io's sports category actually carries, distinct from
-- the structured match data football-data.org provides.
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
    'fraud_alert'
  ));
