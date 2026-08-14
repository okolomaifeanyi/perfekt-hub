"use server";

import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { runWithSupabaseClient } from "@/lib/supabase/request-context.mjs";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import { generateText } from "@/lib/ai/client.mjs";
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
  "You are the built-in AI assistant for Perfekthub, a social app. Be helpful, " +
  "concise, and friendly. You have no access to the user's posts, messages, or " +
  "account data — you're a general-purpose assistant, not a support bot for " +
  "this specific account.";

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
    const { data: recent, error: historyError } = await client
      .from("ai_messages")
      .select("role, content")
      .eq("uid", uid)
      .order("createdat", { ascending: false })
      .limit(CONTEXT_WINDOW);
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
      .map(row => `${row.role === "user" ? "User" : "Assistant"}: ${row.content as string}`)
      .join("\n\n");
    const prompt = history
      ? `${history}\n\nUser: ${trimmed}`
      : `User: ${trimmed}`;

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
