"use server";

import { cookies } from "next/headers";
import { getSupabaseServerClient, getSupabasePublicClient } from "@/lib/supabase/client";
import { runWithSupabaseClient } from "@/lib/supabase/request-context.mjs";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import { generateText } from "@/lib/ai/client.mjs";
import { isContextRelevant, formatCuratedContext, ALL_CURATED_CATEGORIES } from "@/lib/ai/curated-context.mjs";
import { formatPostsContext, isSafeToShare } from "@/lib/ai/posts-context.mjs";
import { formatGroupsContext, isSafeGroupPost } from "@/lib/ai/groups-context.mjs";
import { getPublicFeedForGuests } from "@/app/actions/feed";
import { getUserGroups, listGroups, listGroupPosts } from "@/app/actions/groups";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

// Only the most recent messages are sent to the AI as context — the full
// history still displays in the UI, but sending every past message on every
// turn would grow the request (and cost) unboundedly as a conversation gets
// long.
const CONTEXT_WINDOW = 20;

const ASSISTANT_SYSTEM_PROMPT =
  "You are Nwanne, the built-in AI assistant for Perfekthub, a social app. " +
  "\"Nwanne\" is Igbo for \"sibling\" — a term of kinship/endearment, which is " +
  "the tone to strike: warm and familiar, not corporate. Introduce yourself as " +
  "Nwanne if asked your name. Be helpful, concise, and friendly. You have no " +
  "access to the user's DMs or account data (email, phone, settings) — " +
  "you're a general-purpose assistant, not a support bot for this specific " +
  "account. When a message includes a \"Live app data\" block, that data was " +
  "just pulled fresh from Perfekthub's own public feed (football " +
  "scores/fixtures, news, crypto, movies, and more) — treat it as accurate " +
  "and current, and answer questions about it directly instead of saying " +
  "you lack real-time access. Predictions in that block come from bookmaker " +
  "odds, not your own judgment — present them as \"the odds favor X\", " +
  "never as a guarantee. A \"Public posts\" block, when present, is a sample " +
  "of what people are actually posting on Perfekthub right now — the same " +
  "public posts anyone (even a signed-out visitor) can already see. A " +
  "\"Group activity\" block, when present, only ever includes groups the " +
  "current user is a member of (their own group's posts, private or not) " +
  "and public posts from groups that are open to everyone — never a private " +
  "group's posts to someone outside it. You can reference and quote from " +
  "any of these blocks freely; they're all data the current user is already " +
  "allowed to see. If something isn't in any block, say you don't have data " +
  "on it rather than guessing.";

// Only fetched (and only added to the prompt) when the message actually
// looks like it's asking about something curated_content covers — most
// conversations aren't, so this skips the query and keeps every other
// reply's prompt as small as before. Every category here is public data
// anyone can already see on /updates or Discover, never account-specific.
async function getCuratedContext(message: string): Promise<string | null> {
  if (!isContextRelevant(message)) return null;

  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("curated_content")
    .select("category, title, body, published_at, metadata")
    .in("category", ALL_CURATED_CATEGORIES)
    .order("published_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("getCuratedContext failed:", error);
    return null;
  }

  return formatCuratedContext(data ?? []);
}

// Same relevance gate as getCuratedContext (it also catches post/feed-ish
// phrasing) and the same "public" boundary getPublicFeedForGuests already
// draws for signed-out visitors — regular posts have no enforced visibility
// restriction in this app (only group posts and polls check one), so this
// isn't a wider privacy boundary than what a guest can already see. Flagged
// content still gets filtered out before it reaches the model.
async function getPostsContext(message: string): Promise<string | null> {
  if (!isContextRelevant(message)) return null;

  try {
    const posts = await getPublicFeedForGuests({ limit: 15, sortMode: "trending" });
    return formatPostsContext(posts.filter(isSafeToShare));
  } catch (err) {
    console.error("getPostsContext failed:", err);
    return null;
  }
}

// Groups the current user belongs to (private or not — membership already
// authorizes seeing everything) plus a small sample of other popular
// groups' *public* posts. listGroupPosts (see app/actions/groups.ts)
// already enforces the member/non-member split correctly — a group whose
// default visibility is private and the caller isn't a member of returns
// nothing — this just fans out to it per group rather than re-deriving that
// logic. Bounded to a handful of groups total so one reply doesn't fan out
// into dozens of queries.
const MAX_MEMBER_GROUPS = 5;
const MAX_SAMPLE_GROUPS = 3;
const POSTS_PER_GROUP = 3;

async function getGroupsContext(message: string, uid: string): Promise<string | null> {
  if (!isContextRelevant(message)) return null;

  try {
    const [memberGroups, popularGroups] = await Promise.all([
      getUserGroups(uid),
      listGroups(MAX_MEMBER_GROUPS + MAX_SAMPLE_GROUPS),
    ]);

    const memberGroupIds = new Set(memberGroups.map(g => g.id));
    const sampleGroups = popularGroups
      .filter(g => !memberGroupIds.has(g.id))
      .slice(0, MAX_SAMPLE_GROUPS);

    const targets = [...memberGroups.slice(0, MAX_MEMBER_GROUPS), ...sampleGroups];
    if (targets.length === 0) return null;

    const results = await Promise.all(
      targets.map(async group => {
        const posts = await listGroupPosts(group.id, POSTS_PER_GROUP).catch(() => []);
        return { groupName: group.name, posts: posts.filter(isSafeGroupPost) };
      })
    );

    return formatGroupsContext(results);
  } catch (err) {
    console.error("getGroupsContext failed:", err);
    return null;
  }
}

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

function mapRow(row: Record<string, unknown>): AssistantMessage {
  return {
    id: row.id as string,
    role: row.role as "user" | "assistant",
    content: row.content as string,
    createdAt: row.createdat as string,
  };
}

export async function getAssistantMessages(): Promise<AssistantMessage[]> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  return withSupabaseRequestContext(async client => {
    const { data, error } = await client
      .from("ai_messages")
      .select("*")
      .eq("uid", uid)
      .order("createdat", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  });
}

export async function sendAssistantMessage(content: string): Promise<AssistantMessage> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  const trimmed = content.trim();
  if (!trimmed) throw new Error("Message can't be empty");

  return withSupabaseRequestContext(async client => {
    const [{ data: recent, error: historyError }, curatedContext, postsContext, groupsContext] = await Promise.all([
      client
        .from("ai_messages")
        .select("role, content")
        .eq("uid", uid)
        .order("createdat", { ascending: false })
        .limit(CONTEXT_WINDOW),
      getCuratedContext(trimmed),
      getPostsContext(trimmed),
      getGroupsContext(trimmed, uid),
    ]);
    if (historyError) throw historyError;

    const { error: insertUserError } = await client.from("ai_messages").insert({
      id: crypto.randomUUID(),
      uid,
      role: "user",
      content: trimmed,
    });
    if (insertUserError) throw insertUserError;

    // Chronological order, oldest first, with the new message appended —
    // recent came back newest-first from the query above.
    const history = (recent ?? [])
      .slice()
      .reverse()
      .map(row => `${row.role === "user" ? "User" : "Nwanne"}: ${row.content as string}`)
      .join("\n\n");
    const conversation = history ? `${history}\n\nUser: ${trimmed}` : `User: ${trimmed}`;
    const contextBlocks = [
      // "movies" deliberately absent from this label: movie_news (now
      // Trakt-sourced, see lib/cron/ingest/movies.mjs) is excluded from
      // ALL_CURATED_CATEGORIES (see lib/ai/curated-context.mjs) precisely
      // so it never reaches this prompt. Originally a TMDB-terms issue;
      // kept excluded as the cautious default since Trakt's own AI/ML
      // terms haven't been independently verified either — see the fuller
      // explanation in curated-context.mjs.
      curatedContext &&
        `Live app data (football scores/fixtures, news, crypto, and odds-based predictions):\n${curatedContext}`,
      postsContext && `Public posts on Perfekthub right now:\n${postsContext}`,
      groupsContext && `Group activity (the current user's own groups, plus public posts from other groups):\n${groupsContext}`,
    ].filter(Boolean);
    const prompt = contextBlocks.length > 0 ? `${contextBlocks.join("\n\n")}\n\n${conversation}` : conversation;

    const result = await generateText({
      system: ASSISTANT_SYSTEM_PROMPT,
      prompt,
      maxTokens: 800,
    });

    const replyText = result.text.trim() || "Sorry, I couldn't come up with a response to that.";

    const { data: inserted, error: insertReplyError } = await client
      .from("ai_messages")
      .insert({
        id: crypto.randomUUID(),
        uid,
        role: "assistant",
        content: replyText,
      })
      .select("*")
      .single();
    if (insertReplyError) throw insertReplyError;

    return mapRow(inserted);
  });
}

export async function clearAssistantConversation(): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withSupabaseRequestContext(async client => {
    const { error } = await client.from("ai_messages").delete().eq("uid", uid);
    if (error) throw error;
  });
}
