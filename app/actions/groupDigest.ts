"use server";

import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import { generateText } from "@/lib/ai/client.mjs";

const DIGEST_SYSTEM_PROMPT =
  "You summarize recent activity in a group chat/feed for someone catching up. " +
  "Respond with ONLY the summary itself — no markdown headers, no preamble. Write " +
  "2-5 short bullet points (using \"- \" prefixes) covering the main topics, " +
  "discussions, or announcements, most important first. If there's too little " +
  "content to summarize meaningfully, say so in one short sentence instead of " +
  "padding it out.";

const MAX_POSTS = 15;

export async function generateGroupDigest(
  posts: { authorUsername?: string; text: string; createdAt: string }[]
): Promise<string> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  const recent = posts.filter(p => p.text?.trim()).slice(0, MAX_POSTS);
  if (recent.length === 0) {
    return "Nothing to catch up on yet — no recent posts with text content.";
  }

  const prompt = recent
    .map(p => `[${new Date(p.createdAt).toLocaleDateString()}] ${p.authorUsername ? `@${p.authorUsername}: ` : ""}${p.text.trim()}`)
    .join("\n\n");

  const result = await generateText({
    system: DIGEST_SYSTEM_PROMPT,
    prompt,
    maxTokens: 400,
  });

  return result.text.trim() || "Couldn't generate a summary — try again.";
}
