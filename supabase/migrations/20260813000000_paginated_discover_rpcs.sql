-- Paginated variant of get_top_saved_posts (engagement/save-count mode on
-- the new /discover/saves page).
create or replace function public.get_top_saved_posts_page(
  result_limit int default 20,
  result_offset int default 0
)
returns table (postid text, save_count bigint)
language sql
security definer
set search_path = public
as $$
  select postid, count(*) as save_count
  from public.saved_posts
  group by postid
  order by save_count desc, postid
  limit result_limit
  offset result_offset;
$$;

grant execute on function public.get_top_saved_posts_page(int, int) to authenticated;

-- Time mode for /discover/saves: distinct posts that have at least one
-- save, most recently saved first. saved_posts RLS only lets each user see
-- their own rows, so this needs security definer to see everyone's saves,
-- same justification as get_top_saved_posts (aggregate counts/ordering
-- aren't a privacy leak the way *who* saved a post would be).
create or replace function public.get_recently_saved_posts(
  result_limit int default 20,
  result_offset int default 0
)
returns table (postid text, last_saved_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select postid, max(createdat) as last_saved_at
  from public.saved_posts
  group by postid
  order by last_saved_at desc, postid
  limit result_limit
  offset result_offset;
$$;

grant execute on function public.get_recently_saved_posts(int, int) to authenticated;
