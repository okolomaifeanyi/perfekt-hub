"use server";

import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { runWithSupabaseClient } from "@/lib/supabase/request-context.mjs";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PollOption = {
  id: string;
  label: string;
  voteCount: number;
};

export type PollProps = {
  id: string;
  groupId: string;
  question: string;
  anonymous: boolean;
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

  const options: PollOption[] = (optionRows ?? []).map(row => ({
    id: row.id as string,
    label: row.label as string,
    voteCount: countByOption.get(row.id as string) ?? 0,
  }));

  return {
    id: pollId,
    groupId: pollRow.groupid as string,
    question: pollRow.question as string,
    anonymous: Boolean(pollRow.anonymous),
    createdBy: pollRow.createdby as string,
    createdAt: pollRow.createdat as string,
    closed: Boolean(pollRow.closed),
    options,
    myVoteOptionId,
    totalVotes: options.reduce((sum, o) => sum + o.voteCount, 0),
  };
}

export async function listGroupPolls(groupId: string): Promise<PollProps[]> {
  const { uid } = await getUserFromSession();

  return withSupabaseRequestContext(async client => {
    const { data: pollRows, error } = await client
      .from("group_polls")
      .select("*")
      .eq("groupid", groupId)
      .order("createdat", { ascending: false });
    if (error) throw error;

    return Promise.all((pollRows ?? []).map(row => hydratePoll(client, row, uid)));
  });
}

export async function createPoll(input: {
  groupId: string;
  question: string;
  options: string[];
  anonymous: boolean;
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
