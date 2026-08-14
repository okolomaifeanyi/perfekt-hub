"use server";

import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import { generateText } from "@/lib/ai/client.mjs";

const SMART_REPLY_SYSTEM_PROMPT =
  "You suggest quick reply options for a private chat conversation. Respond with " +
  "ONLY a JSON array of exactly 3 short strings (each under 8 words), no markdown, " +
  "no explanation, no numbering. Keep them casual, natural, and varied in tone " +
  "(e.g. one affirmative, one questioning, one neutral) — like Gmail's Smart Reply " +
  "chips. If the last message doesn't clearly call for a reply (an image with no " +
  "caption, a link, something ambiguous), still suggest 3 generic-but-fitting " +
  "short responses rather than refusing.";

const MAX_HISTORY = 6;

export async function getSmartReplySuggestions(
  recentMessages: { senderId: string; text: string }[]
): Promise<string[]> {
  const { uid } = await getUserFromSession();
  if (!uid) return [];

  const history = recentMessages
    .filter(m => m.text?.trim())
    .slice(-MAX_HISTORY);
  if (history.length === 0) return [];

  // Nothing to suggest a reply to if I sent the last message myself.
  if (history[history.length - 1].senderId === uid) return [];

  const prompt = history
    .map(m => `${m.senderId === uid ? "Me" : "Them"}: ${m.text.trim()}`)
    .join("\n");

  try {
    const result = await generateText({
      system: SMART_REPLY_SYSTEM_PROMPT,
      prompt,
      maxTokens: 150,
    });
    const cleaned = result.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, 3);
  } catch (err) {
    // Suggestions are a nice-to-have on top of a composer that already
    // works without them — never let a failure here surface to the user.
    console.error("getSmartReplySuggestions failed:", err);
    return [];
  }
}
