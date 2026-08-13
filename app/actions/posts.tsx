"use server";

import { cookies } from "next/headers";
import { firestoreAdmin } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { runWithSupabaseClient } from "@/lib/supabase/request-context.mjs";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import { deleteChildrenPosts } from "./util";
import type { SupabaseClient } from "@supabase/supabase-js";

async function withSupabaseRequestContext<T>(
  callback: () => Promise<T>
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

  // The @supabase/ssr server client initializes its session lazily
  // (skipAutoInitialize), so no JWT is attached until an auth method runs and
  // every query before that executes as the `anon` role. Hydrate it first so
  // RLS sees the real user.
  await supabase.auth.getUser();

  return runWithSupabaseClient(supabase, callback);
}

export type PostPollOption = {
  id: string;
  label: string;
  voteCount: number;
};

export type PostPollProps = {
  id: string;
  postId: string;
  createdBy: string;
  createdAt: string;
  closed: boolean;
  options: PostPollOption[];
  myVoteOptionId: string | null;
  totalVotes: number;
};

// Post polls use the request-scoped, RLS-respecting client (unlike the rest
// of this file, which writes through the firestoreAdmin shim) so they go
// through the exact same defense-in-depth policies as group polls, rather
// than relying solely on the getUserFromSession() checks in each function.
async function withPostPollClient<T>(
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

async function hydratePostPoll(
  client: SupabaseClient,
  pollRow: Record<string, unknown>,
  uid: string | null
): Promise<PostPollProps> {
  const pollId = pollRow.id as string;

  const { data: optionRows, error: optionError } = await client
    .from("post_poll_options")
    .select("id, label, position")
    .eq("pollid", pollId)
    .order("position", { ascending: true });
  if (optionError) throw optionError;

  const { data: resultRows, error: resultError } = await client.rpc(
    "get_post_poll_results",
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
      "get_my_post_poll_vote",
      { poll_id: pollId }
    );
    if (myVoteError) throw myVoteError;
    myVoteOptionId = myVoteRows?.[0]?.optionid ?? null;
  }

  const options: PostPollOption[] = (optionRows ?? []).map(row => ({
    id: row.id as string,
    label: row.label as string,
    voteCount: countByOption.get(row.id as string) ?? 0,
  }));

  return {
    id: pollId,
    postId: pollRow.postid as string,
    createdBy: pollRow.createdby as string,
    createdAt: pollRow.createdat as string,
    closed: Boolean(pollRow.closed),
    options,
    myVoteOptionId,
    totalVotes: options.reduce((sum, o) => sum + o.voteCount, 0),
  };
}

export async function createPostPoll(input: {
  postId: string;
  options: string[];
}): Promise<PostPollProps> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  const options = input.options.map(o => o.trim()).filter(Boolean);
  if (options.length < 2) throw new Error("A poll needs at least two options");

  return withPostPollClient(async client => {
    const pollId = crypto.randomUUID();
    const { error: pollError } = await client.from("post_polls").insert({
      id: pollId,
      postid: input.postId,
      createdby: uid,
    });
    if (pollError) throw pollError;

    const { error: optionsError } = await client.from("post_poll_options").insert(
      options.map((label, index) => ({
        id: crypto.randomUUID(),
        pollid: pollId,
        label,
        position: index,
      }))
    );
    if (optionsError) throw optionsError;

    const { data: pollRow, error: fetchError } = await client
      .from("post_polls")
      .select("*")
      .eq("id", pollId)
      .single();
    if (fetchError) throw fetchError;

    return hydratePostPoll(client, pollRow, uid);
  });
}

export async function getPostPoll(postId: string): Promise<PostPollProps | null> {
  const { uid } = await getUserFromSession();

  return withPostPollClient(async client => {
    const { data: pollRow, error } = await client
      .from("post_polls")
      .select("*")
      .eq("postid", postId)
      .maybeSingle();
    if (error) throw error;
    if (!pollRow) return null;

    return hydratePostPoll(client, pollRow, uid);
  });
}

export async function votePostPoll(pollId: string, optionId: string): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withPostPollClient(async client => {
    // The DB already refuses this via RLS/constraints when the poll is
    // closed (group_poll_votes_own_insert-equivalent check), but surface a
    // clear message here instead of a raw RLS error.
    const { data: pollRow, error: pollError } = await client
      .from("post_polls")
      .select("closed")
      .eq("id", pollId)
      .maybeSingle();
    if (pollError) throw pollError;
    if (!pollRow) throw new Error("Poll not found");
    if ((pollRow as { closed: boolean }).closed) throw new Error("This poll is closed");

    const { data: option, error: optionError } = await client
      .from("post_poll_options")
      .select("id")
      .eq("id", optionId)
      .eq("pollid", pollId)
      .maybeSingle();
    if (optionError) throw optionError;
    if (!option) throw new Error("Invalid option for this poll");

    const { error: deleteError } = await client
      .from("post_poll_votes")
      .delete()
      .eq("pollid", pollId)
      .eq("uid", uid);
    if (deleteError) throw deleteError;

    const { error: insertError } = await client.from("post_poll_votes").insert({
      id: crypto.randomUUID(),
      pollid: pollId,
      optionid: optionId,
      uid,
    });
    if (insertError) throw insertError;
  });
}

export async function closePostPoll(pollId: string): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withPostPollClient(async client => {
    const { data, error } = await client
      .from("post_polls")
      .update({ closed: true })
      .eq("id", pollId)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Only the poll creator can close it");
    }
  });
}

export async function deletePostAction(postId: string): Promise<void> {
  if (!postId) {
    throw new Error("postId is required");
  }

  const { uid } = await getUserFromSession();
  if (!uid) {
    throw new Error("You must be signed in to delete posts");
  }

  await withSupabaseRequestContext(async () => {
    const db = firestoreAdmin;
    const postRef = db.doc(`posts/${postId}`);
    const postSnap = await postRef.get();

    if (!postSnap.exists()) {
      throw new Error("Post not found");
    }

    const post = postSnap.data()!;
    if (post.userId !== uid) {
      throw new Error("You can only delete your own posts");
    }

    const batch = db.batch();

    const engSnap = await postRef.collection("engagements").get();
    for (const eng of engSnap.docs) {
      batch.delete(eng.ref);
    }

    batch.delete(postRef);

    await batch.commit();

    await deleteChildrenPosts(postId);
  });
}
