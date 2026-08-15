-- Home feed, discover search, and an individual post page all became
-- reachable without an account (see proxy.ts / lib/public-routes.mjs) —
-- previously the session cookie requirement was itself a soft rate limit.
-- A single atomic UPSERT avoids the read-then-write race a naive
-- select-count-then-update approach would have under concurrent requests
-- from the same client.
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
-- No policies granted to anon/authenticated on purpose — only
-- check_rate_limit() (security definer, below) may touch this table.

create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
        when public.rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
          then 1
        else public.rate_limits.count + 1
      end,
      window_start = case
        when public.rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
          then now()
        else public.rate_limits.window_start
      end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

grant execute on function public.check_rate_limit(text, integer, integer) to anon, authenticated;
