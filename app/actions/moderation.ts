"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/client";
import { analyzeImage, generateText } from "@/lib/ai/client.mjs";
import { updateEngagementScore } from "@/app/actions/reactions";
import { firestoreAdmin } from "@/lib/supabase";

const ENRICHMENT_SYSTEM_PROMPT = `You moderate and tag social media posts. Respond with ONLY a JSON object (no markdown, no code fences, no explanation) in exactly this shape:
{"moderation":"safe"|"sensitive","topics":["topic1","topic2"],"quality":0-100}

moderation: "sensitive" if an attached image contains nudity, explicit sexual content, or graphic violence/gore — otherwise "safe". If there is no image, always "safe".
topics: 1-4 short lowercase single-word-or-two topic tags describing what the post is about (e.g. "travel", "food", "sports", "humor", "technology", "music"). Empty array if there's nothing to tag.
quality: a 0-100 estimate of how engaging/well-crafted the post is likely to be (effort, clarity, originality) — an engagement-potential signal, not a moral judgment.`;

type Enrichment = { moderation: "safe" | "sensitive"; topics: string[]; quality: number };

function parseEnrichment(rawText: string): Enrichment {
  // Providers occasionally wrap JSON in markdown fences despite the
  // instruction not to — strip fences before parsing rather than failing.
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  const moderation = parsed.moderation === "sensitive" ? "sensitive" : "safe";
  const topics = Array.isArray(parsed.topics)
    ? parsed.topics.filter((t: unknown) => typeof t === "string").slice(0, 4)
    : [];
  const quality = Number.isFinite(parsed.quality)
    ? Math.max(0, Math.min(100, Math.round(parsed.quality)))
    : 50;

  return { moderation, topics, quality };
}

/**
 * Best-effort AI enrichment for a post: NSFW moderation classification (for
 * the blur/tap-to-view gate) plus topic tags and a quality score (feeds the
 * existing engagementScore ranking as a cold-start signal for posts with no
 * real engagement yet — see calculateEngagementScore in reactions.ts).
 *
 * Deliberately fails open: if no provider is configured or every provider
 * call fails, the post's moderationstatus simply stays 'pending' (renders
 * normally, unblurred) rather than the post creation itself failing or
 * content being wrongly hidden. This app had zero moderation before this,
 * so "sometimes unchecked" is strictly better than "never checked", not a
 * regression to guard against.
 */
export async function enrichPost(postId: string): Promise<void> {
  const client = getSupabaseAdminClient();

  const { data: post, error } = await client
    .from("posts")
    .select("content, media")
    .eq("id", postId)
    .maybeSingle();
  if (error || !post) {
    console.error("enrichPost: could not load post", postId, error);
    return;
  }

  const media = (post.media as { src: string; type: string }[] | null) ?? [];
  const firstImage = media.find(m => m.type === "image")?.src;
  const otherImages = media.filter(m => m.type === "image" && m.src !== firstImage).map(m => m.src);

  try {
    let enrichment: Enrichment;

    if (firstImage) {
      const result = await analyzeImage({
        system: ENRICHMENT_SYSTEM_PROMPT,
        prompt: `Post caption: ${JSON.stringify((post.content as string) || "")}`,
        imageUrl: firstImage,
        maxTokens: 200,
      });
      enrichment = parseEnrichment(result.text);

      // A multi-image post could have its NSFW image anywhere in the set,
      // not just the first — check the rest too (cheap: only runs when
      // there's more than one image) and let any "sensitive" finding win.
      if (enrichment.moderation === "safe" && otherImages.length > 0) {
        const rest = await Promise.all(
          otherImages.map(imageUrl =>
            analyzeImage({
              system: ENRICHMENT_SYSTEM_PROMPT,
              prompt: "Classify this image.",
              imageUrl,
              maxTokens: 50,
            }).catch(err => {
              console.error("enrichPost: secondary image check failed", err);
              return null;
            })
          )
        );
        if (rest.some(r => r && parseEnrichment(r.text).moderation === "sensitive")) {
          enrichment = { ...enrichment, moderation: "sensitive" };
        }
      }
    } else {
      const result = await generateText({
        system: ENRICHMENT_SYSTEM_PROMPT,
        prompt: `Post caption: ${JSON.stringify((post.content as string) || "")}`,
        maxTokens: 200,
      });
      enrichment = parseEnrichment(result.text);
    }

    await client
      .from("posts")
      .update({
        moderationstatus: enrichment.moderation,
        aitopics: enrichment.topics,
        aiqualityscore: enrichment.quality,
      })
      .eq("id", postId);

    // engagementScore is 0 for a post with no reactions/replies/views yet
    // and only gets recomputed when one of those happens — without this,
    // the AI quality signal added in calculateEngagementScore would never
    // apply to a fresh post until its first reaction, missing the exact
    // cold-start case it's meant to help with. Using the directly-awaited
    // updateEngagementScore rather than scheduleEngagementScoreUpdate
    // deliberately — that one debounces via a bare, un-awaited setTimeout,
    // which this after() callback isn't guaranteed to stay alive for.
    await updateEngagementScore(firestoreAdmin.collection("posts").doc(postId));
  } catch (err) {
    console.error("enrichPost failed, leaving moderationstatus as pending:", err);
  }
}
