"use server";

import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import { generateText } from "@/lib/ai/client.mjs";

const DRAFT_SYSTEM_PROMPT =
  "You write short, engaging draft copy for a social app post. Respond with " +
  "ONLY the draft text itself — no quotes, no markdown, no preamble like " +
  "\"Here's a draft:\". Keep it under 280 characters, natural and specific to " +
  "the details given, not generic filler.";

/**
 * Drafts a short description from a few structured details — used by the
 * product-listing composer (name/price) and the event dialog
 * (title/location/time). Purely a starting point: the caller always
 * populates an editable field with the result, never sends it directly.
 */
export async function generateDraftDescription(context: string): Promise<string> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  const trimmed = context.trim();
  if (!trimmed) throw new Error("Nothing to draft from yet");

  const result = await generateText({
    system: DRAFT_SYSTEM_PROMPT,
    prompt: trimmed,
    maxTokens: 150,
  });

  const text = result.text.trim();
  if (!text) throw new Error("Couldn't generate a draft — try again");
  return text;
}
