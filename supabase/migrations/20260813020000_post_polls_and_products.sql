-- Post-level (non-group) polls and product listings, attachable from the
-- main composer. Both ride on the existing posts table/RLS (a post is
-- already publicly readable when groupid is null, per posts_read_all)
-- rather than duplicating visibility rules — these tables just hold the
-- type-specific payload for a post.
alter table public.posts
  add column if not exists posttype text not null default 'text'
    check (posttype in ('text', 'poll', 'product'));

create table if not exists public.post_polls (
  id text primary key,
  postid text not null unique references public.posts(id) on delete cascade,
  createdby text not null references public.users(uid) on delete cascade,
  createdat timestamptz not null default now(),
  closed boolean not null default false
);

create table if not exists public.post_poll_options (
  id text primary key,
  pollid text not null references public.post_polls(id) on delete cascade,
  label text not null,
  position integer not null default 0,
  unique (id, pollid)
);

-- Composite FK against (id, pollid) rather than plain id — same fix as the
-- group poll cross-poll vote injection (20260812030000): without it,
-- optionid only has to exist ANYWHERE, so a vote could be recorded against
-- an option belonging to a different poll entirely.
create table if not exists public.post_poll_votes (
  id text primary key,
  pollid text not null references public.post_polls(id) on delete cascade,
  optionid text not null,
  uid text not null references public.users(uid) on delete cascade,
  createdat timestamptz not null default now(),
  unique (pollid, uid),
  foreign key (optionid, pollid) references public.post_poll_options(id, pollid)
);

create index if not exists post_polls_postid_idx on public.post_polls (postid);
create index if not exists post_poll_options_pollid_idx on public.post_poll_options (pollid);
create index if not exists post_poll_votes_pollid_idx on public.post_poll_votes (pollid);

alter table public.post_polls enable row level security;
alter table public.post_poll_options enable row level security;
alter table public.post_poll_votes enable row level security;

grant select on public.post_polls, public.post_poll_options to anon, authenticated;
grant insert, update on public.post_polls to authenticated;
grant insert on public.post_poll_options to authenticated;
grant select, insert, delete on public.post_poll_votes to authenticated;

drop policy if exists "post_polls_select_all" on public.post_polls;
create policy "post_polls_select_all" on public.post_polls for select
  to anon, authenticated using (true);

drop policy if exists "post_polls_insert_own" on public.post_polls;
create policy "post_polls_insert_own" on public.post_polls for insert
  to authenticated with check (
    auth.uid()::text = createdby
    and exists (
      select 1 from public.posts p
      where p.id = post_polls.postid and p.userid = auth.uid()::text
    )
  );

drop policy if exists "post_polls_creator_update" on public.post_polls;
create policy "post_polls_creator_update" on public.post_polls for update
  to authenticated using (auth.uid()::text = createdby)
  with check (auth.uid()::text = createdby);

drop policy if exists "post_poll_options_select_all" on public.post_poll_options;
create policy "post_poll_options_select_all" on public.post_poll_options for select
  to anon, authenticated using (true);

drop policy if exists "post_poll_options_creator_insert" on public.post_poll_options;
create policy "post_poll_options_creator_insert" on public.post_poll_options for insert
  to authenticated with check (
    exists (
      select 1 from public.post_polls p
      where p.id = post_poll_options.pollid and p.createdby = auth.uid()::text
    )
  );

-- Votes: same "own row only" privacy pattern as group polls — never expose
-- who voted for what, only aggregate counts via the RPC below.
drop policy if exists "post_poll_votes_own_select" on public.post_poll_votes;
create policy "post_poll_votes_own_select" on public.post_poll_votes for select
  to authenticated using (auth.uid()::text = uid);

drop policy if exists "post_poll_votes_own_insert" on public.post_poll_votes;
create policy "post_poll_votes_own_insert" on public.post_poll_votes for insert
  to authenticated with check (
    auth.uid()::text = uid
    and exists (
      select 1 from public.post_polls p where p.id = post_poll_votes.pollid and not p.closed
    )
  );

drop policy if exists "post_poll_votes_own_delete" on public.post_poll_votes;
create policy "post_poll_votes_own_delete" on public.post_poll_votes for delete
  to authenticated using (auth.uid()::text = uid);

create or replace function public.get_post_poll_results(poll_id text)
returns table (optionid text, vote_count bigint)
language sql
security definer
set search_path = public
as $$
  select o.id as optionid, count(v.id) as vote_count
  from public.post_poll_options o
  left join public.post_poll_votes v on v.optionid = o.id
  where o.pollid = poll_id
  group by o.id;
$$;

grant execute on function public.get_post_poll_results(text) to anon, authenticated;

create or replace function public.get_my_post_poll_vote(poll_id text)
returns table (optionid text)
language sql
security definer
set search_path = public
as $$
  select optionid from public.post_poll_votes
  where pollid = poll_id and uid = auth.uid()::text
  limit 1;
$$;

grant execute on function public.get_my_post_poll_vote(text) to authenticated;

-- Product listings attached to a post. The post's own single media image is
-- the feed thumbnail (only one image shows in the feed, by design); the
-- `images` array here holds the rest of the gallery, shown on the post
-- detail page. No payment processing is wired up — there's no payment
-- provider configured in this project — so this is a listing with a
-- "message seller" call to action, not a checkout.
create table if not exists public.post_products (
  id text primary key,
  postid text not null unique references public.posts(id) on delete cascade,
  selleruid text not null references public.users(uid) on delete cascade,
  name text not null,
  price numeric(12, 2) not null check (price >= 0),
  currency text not null default 'USD',
  images text[] not null default '{}'::text[],
  sold boolean not null default false,
  createdat timestamptz not null default now()
);

create index if not exists post_products_postid_idx on public.post_products (postid);
create index if not exists post_products_selleruid_idx on public.post_products (selleruid);

alter table public.post_products enable row level security;
grant select on public.post_products to anon, authenticated;
grant insert, update on public.post_products to authenticated;

drop policy if exists "post_products_select_all" on public.post_products;
create policy "post_products_select_all" on public.post_products for select
  to anon, authenticated using (true);

drop policy if exists "post_products_insert_own" on public.post_products;
create policy "post_products_insert_own" on public.post_products for insert
  to authenticated with check (
    auth.uid()::text = selleruid
    and exists (
      select 1 from public.posts p
      where p.id = post_products.postid and p.userid = auth.uid()::text
    )
  );

drop policy if exists "post_products_seller_update" on public.post_products;
create policy "post_products_seller_update" on public.post_products for update
  to authenticated using (auth.uid()::text = selleruid)
  with check (auth.uid()::text = selleruid);
