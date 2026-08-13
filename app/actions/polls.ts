"use server";

import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { runWithSupabaseClient } from "@/lib/supabase/request-context.mjs";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PollVoter = {
  uid: string;
  username: string;
  fullName: string;
  photoURL: string | null;
};

export type PollOption = {
  id: string;
  label: string;
  voteCount: number;
  voters?: PollVoter[];
};

export type PollVisibility = "public" | "private";

export type PollProps = {
  id: string;
  groupId: string;
  question: string;
  anonymous: boolean;
  visibility: PollVisibility;
  createdBy: string;
  createdAt: string;
  closed: boolean;
  options: PollOption[];
  myVoteOptionId: string | null;
  totalVotes: number;
};

async function withSupabaseRequestContext<T>(
  callback: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: cookieUpdates => {
      cookieUpdates.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    },
  });

  await supabase.auth.getUser();
  return runWithSupabaseClient(supabase, () => callback(supabase));
}

async function hydratePoll(
  client: SupabaseClient,
  pollRow: Record<string, unknown>,
  uid: string | null
): Promise<PollProps> {
  const pollId = pollRow.id as string;

  const { data: optionRows, error: optionError } = await client
    .from("group_poll_options")
    .select("id, label, position")
    .eq("pollid", pollId)
    .order("position", { ascending: true });
  if (optionError) throw optionError;

  const { data: resultRows, error: resultError } = await client.rpc(
    "get_poll_results",
    { poll_id: pollId }
  );
  if (resultError) throw resultError;

  const countByOption = new Map<string, number>(
    (resultRows ?? []).map((row: { optionid: string; vote_count: number }) => [
      row.optionid,
      Number(row.vote_count),
    ])
  );

  let myVoteOptionId: string | null = null;
  if (uid) {
    const { data: myVoteRows, error: myVoteError } = await client.rpc(
      "get_my_poll_vote",
      { poll_id: pollId }
    );
    if (myVoteError) throw myVoteError;
    myVoteOptionId = myVoteRows?.[0]?.optionid ?? null;
  }

  // Non-anonymous polls show who voted for what — get_poll_voters()
  // itself refuses to return rows for an anonymous poll (checked at the
  // database level, not just skipped here), so this is safe to always
  // attempt rather than needing to trust the `anonymous` flag client-side.
  const votersByOption = new Map<string, PollVoter[]>();
  if (!pollRow.anonymous) {
    const { data: voterRows, error: voterError } = await client.rpc(
      "get_poll_voters",
      { poll_id: pollId }
    );
    if (voterError) throw voterError;

    const voterUids = Array.from(
      new Set((voterRows ?? []).map((row: { uid: string }) => row.uid))
    );
    if (voterUids.length > 0) {
      const { data: profileRows, error: profileError } = await client
        .from("users")
        .select("uid, username, fullname, photourl")
        .in("uid", voterUids);
      if (profileError) throw profileError;

      const profileByUid = new Map(
        (profileRows ?? []).map(row => [row.uid as string, row])
      );

      for (const row of (voterRows ?? []) as { optionid: string; uid: string }[]) {
        const profile = profileByUid.get(row.uid) as
          | { uid: string; username: string; fullname: string; photourl: string | null }
          | undefined;
        const voter: PollVoter = {
          uid: row.uid,
          username: profile?.username ?? "",
          fullName: profile?.fullname ?? "",
          photoURL: profile?.photourl ?? null,
        };
        const existing = votersByOption.get(row.optionid) ?? [];
        existing.push(voter);
        votersByOption.set(row.optionid, existing);
      }
    }
  }

  const options: PollOption[] = (optionRows ?? []).map(row => ({
    id: row.id as string,
    label: row.label as string,
    voteCount: countByOption.get(row.id as string) ?? 0,
    voters: votersByOption.get(row.id as string) ?? [],
  }));

  return {
    id: pollId,
    groupId: pollRow.groupid as string,
    question: pollRow.question as string,
    anonymous: Boolean(pollRow.anonymous),
    visibility: (pollRow.visibility as PollVisibility) ?? "public",
    createdBy: pollRow.createdby as string,
    createdAt: pollRow.createdat as string,
    closed: Boolean(pollRow.closed),
    options,
    myVoteOptionId,
    totalVotes: options.reduce((sum, o) => sum + o.voteCount, 0),
  };
}

export async function listGroupPolls(groupId: string, memberUid: string | null = null): Promise<PollProps[]> {
  const { uid } = await getUserFromSession();
  const effectiveUid = uid ?? memberUid;

  return withSupabaseRequestContext(async client => {
    let query = client
      .from("group_polls")
      .select("*")
      .eq("groupid", groupId)
      .order("createdat", { ascending: false });

    // Non-members only see public polls
    if (!effectiveUid) {
      query = query.eq("visibility", "public");
    }

    const { data: pollRows, error } = await query;
    if (error) throw error;

    return Promise.all((pollRows ?? []).map(row => hydratePoll(client, row, effectiveUid)));
  });
}

export async function createPoll(input: {
  groupId: string;
  question: string;
  options: string[];
  anonymous: boolean;
  visibility?: PollVisibility;
}): Promise<PollProps> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  const question = input.question.trim();
  if (!question) throw new Error("Poll question is required");

  const options = input.options.map(o => o.trim()).filter(Boolean);
  if (options.length < 2) throw new Error("A poll needs at least two options");

  return withSupabaseRequestContext(async client => {
    const pollId = crypto.randomUUID();
    const { error: pollError } = await client.from("group_polls").insert({
      id: pollId,
      groupid: input.groupId,
      question,
      anonymous: input.anonymous,
      visibility: input.visibility ?? "public",
      createdby: uid,
    });
    if (pollError) throw pollError;

    const { error: optionsError } = await client.from("group_poll_options").insert(
      options.map((label, index) => ({
        id: crypto.randomUUID(),
        pollid: pollId,
        label,
        position: index,
      }))
    );
    if (optionsError) throw optionsError;

    const { data: pollRow, error: fetchError } = await client
      .from("group_polls")
      .select("*")
      .eq("id", pollId)
      .single();
    if (fetchError) throw fetchError;

    return hydratePoll(client, pollRow, uid);
  });
}

export async function votePoll(pollId: string, optionId: string): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withSupabaseRequestContext(async client => {
    // The DB already refuses this vote via RLS/constraints when the poll is
    // closed or the caller isn't a group member (group_poll_votes_own_insert
    // requires both), but that surfaces as a raw "row-level security policy"
    // Postgres error. Check both up front so the UI can show something a
    // user can actually act on instead.
    const { data: pollRow, error: pollError } = await client
      .from("group_polls")
      .select("groupid, closed")
      .eq("id", pollId)
      .maybeSingle();
    if (pollError) throw pollError;
    if (!pollRow) throw new Error("Poll not found");
    if ((pollRow as { closed: boolean }).closed) {
      throw new Error("This poll is closed");
    }

    const { data: membership, error: membershipError } = await client
      .from("group_members")
      .select("uid")
      .eq("groupid", (pollRow as { groupid: string }).groupid)
      .eq("uid", uid)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) throw new Error("Join the group to vote on this poll");

    // Belt and suspenders alongside the composite FK + RLS check on
    // group_poll_votes: confirm the option actually belongs to this poll
    // before writing, so a mismatched pair fails with a clear message here
    // instead of a raw constraint-violation error from the insert.
    const { data: option, error: optionError } = await client
      .from("group_poll_options")
      .select("id")
      .eq("id", optionId)
      .eq("pollid", pollId)
      .maybeSingle();
    if (optionError) throw optionError;
    if (!option) throw new Error("Invalid option for this poll");

    // A member can only ever see/touch their own vote row (enforced by
    // RLS), so changing a vote is delete-then-insert rather than an
    // update — there's nothing else it could conflict with.
    const { error: deleteError } = await client
      .from("group_poll_votes")
      .delete()
      .eq("pollid", pollId)
      .eq("uid", uid);
    if (deleteError) throw deleteError;

    const { error: insertError } = await client.from("group_poll_votes").insert({
      id: crypto.randomUUID(),
      pollid: pollId,
      optionid: optionId,
      uid,
    });
    if (insertError) throw insertError;
  });
}

export async function closePoll(pollId: string): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withSupabaseRequestContext(async client => {
    const { data, error } = await client
      .from("group_polls")
      .update({ closed: true })
      .eq("id", pollId)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Only the poll creator or a group admin can close it");
    }
  });
}
