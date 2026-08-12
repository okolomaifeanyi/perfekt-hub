-- votePoll only validated that the caller belongs to pollId's group before
-- inserting {pollid, optionid, uid} — nothing ever confirmed optionid
-- actually belongs to pollid. Worse, get_poll_results() joins votes to
-- options purely on v.optionid = o.id (never checking v.pollid), so a vote
-- row with a mismatched pollid/optionid pair still counts toward whatever
-- poll actually owns that option. Since group_poll_votes is only unique on
-- (pollid, uid), a member of any OTHER poll could cast one fake vote per
-- poll they belong to, all pointing optionid at the same target option —
-- stuffing a poll's results without ever joining its group.
--
-- A composite foreign key makes "this option belongs to this poll" a hard
-- database guarantee instead of something application code has to
-- remember to check.
alter table public.group_poll_options
  drop constraint if exists group_poll_options_id_pollid_key;
alter table public.group_poll_options
  add constraint group_poll_options_id_pollid_key unique (id, pollid);

alter table public.group_poll_votes
  drop constraint if exists group_poll_votes_option_belongs_to_poll;
alter table public.group_poll_votes
  add constraint group_poll_votes_option_belongs_to_poll
  foreign key (optionid, pollid) references public.group_poll_options (id, pollid) on delete cascade;

-- Defense in depth: also require it at the RLS layer, so even a client
-- that somehow bypassed the FK (or a future refactor that relaxes it)
-- can't insert a mismatched vote.
drop policy if exists "group_poll_votes_own_insert" on public.group_poll_votes;
create policy "group_poll_votes_own_insert" on public.group_poll_votes for insert to authenticated
  with check (
    auth.uid()::text = uid
    and exists (
      select 1
      from public.group_poll_options o
      join public.group_polls p on p.id = o.pollid
      join public.group_members gm on gm.groupid = p.groupid
      where o.id = group_poll_votes.optionid
        and o.pollid = group_poll_votes.pollid
        and gm.uid = auth.uid()::text
        and not p.closed
    )
  );
