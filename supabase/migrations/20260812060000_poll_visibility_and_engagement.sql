-- 1. Poll visibility (public visible to all, private = members only)
alter table public.group_polls
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'private'));

-- 2. Group default post visibility (admin-set default for posts in that group)
alter table public.groups
  add column if not exists defaultpostvisibility text not null default 'public'
    check (defaultpostvisibility in ('public', 'private'));

-- 3. Engagement score trigger — keeps posts.engagementscore current so the
--    trending feed actually reflects likes, comments, quotes, and reposts.
--    The score is: reactions_total + replies*2 + quotes*3 + reposts*2
create or replace function public.refresh_post_engagement_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id text;
  score int;
begin
  target_id := coalesce(new.id, old.id);

  select
    coalesce(replycount, 0) * 2 +
    coalesce(quotecount, 0) * 3 +
    coalesce(
      (select sum(val::int)
       from jsonb_each_text(coalesce(reactioncounts, '{}'::jsonb)) as t(key, val)), 0
    )
  into score
  from public.posts
  where id = target_id;

  update public.posts
  set engagementscore = coalesce(score, 0)
  where id = target_id;

  return coalesce(new, old);
end;
$$;

-- Trigger fires after any update to counter or reaction columns
drop trigger if exists trg_refresh_engagement on public.posts;
create trigger trg_refresh_engagement
  after update of replycount, quotecount, reactioncounts
  on public.posts
  for each row
  execute function public.refresh_post_engagement_score();
