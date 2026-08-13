-- AI-assisted content moderation and feed-ranking signals. Both are
-- best-effort enrichment on top of a post that already exists and is
-- already visible under the existing posts_read_all policy — a post is
-- never gated on these columns being populated (moderationstatus defaults
-- to 'pending', meaning "not yet checked, render normally"), only
-- 'sensitive' changes client rendering (blur + tap-to-view). If the AI
-- provider chain is unconfigured or fails, posts simply stay 'pending'
-- forever rather than the app breaking or content being wrongly hidden.
alter table public.posts
  add column if not exists moderationstatus text not null default 'pending'
    check (moderationstatus in ('pending', 'safe', 'sensitive'));

alter table public.posts
  add column if not exists aitopics text[] not null default '{}'::text[];

alter table public.posts
  add column if not exists aiqualityscore numeric;

create index if not exists posts_moderationstatus_idx on public.posts (moderationstatus);
