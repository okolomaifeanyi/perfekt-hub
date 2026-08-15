-- Platform-authored content (football scores/fixtures, crypto/news, etc.),
-- pulled on a schedule from external APIs — deliberately a separate table
-- from posts, not a bot account. Read-only for everyone, including
-- signed-out visitors, same as the public feed/discover surfaces; only the
-- service role (used by the cron ingestion routes) can write to it.
create table if not exists public.curated_content (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'football_fixture',
    'football_live',
    'football_result',
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
  )),
  title text not null,
  body text,
  image_url text,
  source_url text,
  source_name text not null,
  -- Dedup key from the source API (e.g. football-data.org's match id, a
  -- news article's guid). Live scores reuse this to UPSERT the same row
  -- as the match progresses instead of creating a new one every poll.
  external_id text,
  -- Category-specific structured data that doesn't need its own columns
  -- (e.g. {homeTeam, awayTeam, homeScore, awayScore, minute, status,
  -- competition} for football; {symbol, priceUsd, change24h} for crypto).
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists curated_content_dedup_idx
  on public.curated_content (category, external_id)
  where external_id is not null;

create index if not exists curated_content_category_published_idx
  on public.curated_content (category, published_at desc);

alter table public.curated_content enable row level security;

grant select on public.curated_content to anon, authenticated;
grant select, insert, update, delete on public.curated_content to service_role;

drop policy if exists "curated_content_read_all" on public.curated_content;
create policy "curated_content_read_all"
on public.curated_content
for select
to anon, authenticated
using (true);

-- No insert/update/delete policy for anon/authenticated at all — only the
-- service role (bypasses RLS entirely) writes here, from the cron routes.

-- Keeps updated_at accurate across the UPSERTs a live-score poll does
-- (score/minute changing on an existing row, not just new inserts).
create or replace function public.touch_curated_content_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists curated_content_touch_updated_at on public.curated_content;
create trigger curated_content_touch_updated_at
  before update on public.curated_content
  for each row
  execute function public.touch_curated_content_updated_at();
