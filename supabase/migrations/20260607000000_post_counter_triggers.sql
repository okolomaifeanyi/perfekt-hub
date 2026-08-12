create schema if not exists app_private;

create or replace function app_private.sync_post_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_post_id text;
  quote_post_id text;
begin
  if tg_op = 'INSERT' then
    update public.users
    set postscount = coalesce(postscount, 0) + 1
    where uid = new.userid;

    parent_post_id := nullif(new.parentpostid, '');
    if parent_post_id is not null then
      update public.posts
      set replycount = coalesce(replycount, 0) + 1
      where id = parent_post_id;
    end if;

    quote_post_id := nullif(new.quotepostid, '');
    if quote_post_id is not null then
      update public.posts
      set quotecount = coalesce(quotecount, 0) + 1
      where id = quote_post_id;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.users
    set postscount = greatest(coalesce(postscount, 0) - 1, 0)
    where uid = old.userid;

    parent_post_id := nullif(old.parentpostid, '');
    if parent_post_id is not null then
      update public.posts
      set replycount = greatest(coalesce(replycount, 0) - 1, 0)
      where id = parent_post_id;
    end if;

    quote_post_id := nullif(old.quotepostid, '');
    if quote_post_id is not null then
      update public.posts
      set quotecount = greatest(coalesce(quotecount, 0) - 1, 0)
      where id = quote_post_id;
    end if;

    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists on_post_created_sync_counters on public.posts;

create trigger on_post_created_sync_counters
after insert on public.posts
for each row
execute function app_private.sync_post_counters();

drop trigger if exists on_post_deleted_sync_counters on public.posts;

create trigger on_post_deleted_sync_counters
after delete on public.posts
for each row
execute function app_private.sync_post_counters();
