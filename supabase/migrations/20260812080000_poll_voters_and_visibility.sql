-- 1. Non-anonymous polls should actually show who voted for what. Until
--    now, anonymous was purely cosmetic — get_poll_results only ever
--    returned aggregate counts regardless of the flag. This RPC returns
--    per-voter rows, but only when the poll is NOT anonymous and the
--    caller is a member of the poll's group; an anonymous poll returns
--    nothing here no matter who asks, including the poll creator.
create or replace function public.get_poll_voters(poll_id text)
returns table (optionid text, uid text)
language sql
security definer
set search_path = public
as $$
  select v.optionid, v.uid
  from public.group_poll_votes v
  join public.group_polls p on p.id = v.pollid
  where v.pollid = poll_id
    and p.anonymous = false
    and exists (
      select 1 from public.group_members gm
      where gm.groupid = p.groupid and gm.uid = auth.uid()::text
    );
$$;

grant execute on function public.get_poll_voters(text) to authenticated;

-- 2. Poll visibility ('public'/'private') was added in
--    20260812060000 but never actually enforced — group_polls_member_select
--    required group membership unconditionally, so a "public" poll was
--    still invisible to non-members, and the results/vote RPCs gated on
--    membership too. Bring the RLS + RPCs in line with what listGroupPolls
--    already assumes: public polls are readable outside the group.
drop policy if exists "group_polls_member_select" on public.group_polls;
create policy "group_polls_member_select"
on public.group_polls
for select
to authenticated
using (
  visibility = 'public'
  or exists (
    select 1 from public.group_members gm
    where gm.groupid = group_polls.groupid and gm.uid = auth.uid()::text
  )
);

drop policy if exists "group_polls_anon_select" on public.group_polls;
create policy "group_polls_anon_select"
on public.group_polls
for select
to anon
using (visibility = 'public');

grant select on public.group_polls to anon;

drop policy if exists "group_poll_options_member_select" on public.group_poll_options;
create policy "group_poll_options_member_select"
on public.group_poll_options
for select
to authenticated
using (
  exists (
    select 1 from public.group_polls p
    where p.id = group_poll_options.pollid
      and (
        p.visibility = 'public'
        or exists (
          select 1 from public.group_members gm
          where gm.groupid = p.groupid and gm.uid = auth.uid()::text
        )
      )
  )
);

drop policy if exists "group_poll_options_anon_select" on public.group_poll_options;
create policy "group_poll_options_anon_select"
on public.group_poll_options
for select
to anon
using (
  exists (
    select 1 from public.group_polls p
    where p.id = group_poll_options.pollid and p.visibility = 'public'
  )
);

grant select on public.group_poll_options to anon;

-- get_poll_results/get_my_poll_vote gated on membership only — widen to
-- also allow a public poll's results to be read by anyone.
create or replace function public.get_poll_results(poll_id text)
returns table (optionid text, vote_count bigint)
language sql
security definer
set search_path = public
as $$
  select o.id as optionid, count(v.id) as vote_count
  from public.group_poll_options o
  left join public.group_poll_votes v on v.optionid = o.id
  where o.pollid = poll_id
    and exists (
      select 1
      from public.group_polls p
      where p.id = poll_id
        and (
          p.visibility = 'public'
          or exists (
            select 1 from public.group_members gm
            where gm.groupid = p.groupid and gm.uid = auth.uid()::text
          )
        )
    )
  group by o.id;
$$;

grant execute on function public.get_poll_results(text) to anon;
