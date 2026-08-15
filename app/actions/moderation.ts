"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/client";
import { analyzeImage, generateText } from "@/lib/ai/client.mjs";
import { updateEngagementScore } from "@/app/actions/reactions";
import { firestoreAdmin } from "@/lib/supabase";

const ENRICHMENT_SYSTEM_PROMPT = `You moderate, tag, and describe social media posts for accessibility. Respond with ONLY a JSON object (no markdown, no code fences, no explanation) in exactly this shape:
{"moderation":"safe"|"sensitive","topics":["topic1","topic2"],"quality":0-100,"alttext":"...","texttoxic":true|false}

moderation: "sensitive" if an attached image contains nudity, explicit sexual content, or graphic violence/gore — otherwise "safe". If there is no image, always "safe".
topics: 1-4 short lowercase single-word-or-two topic tags describing what the post is about (e.g. "travel", "food", "sports", "humor", "technology", "music"). Empty array if there's nothing to tag.
quality: a 0-100 estimate of how engaging/well-crafted the post is likely to be (effort, clarity, originality) — an engagement-potential signal, not a moral judgment.
alttext: a concise (under 125 characters), factual accessibility description of what is visually in the attached image, for a screen-reader user — describe the image itself, not the caption. Empty string if there is no image.
texttoxic: true if the post's own caption text (not the image) contains harassment, hate speech, targeted insults, or spam — otherwise false.`;

type Enrichment = {
  moderation: "safe" | "sensitive";
  topics: string[];
  quality: number;
  altText: string;
  textToxic: boolean;
};

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
  const altText = typeof parsed.alttext === "string" ? parsed.alttext.slice(0, 200) : "";
  const textToxic = parsed.texttoxic === true;

  return { moderation, topics, quality, altText, textToxic };
}

/**
 * Best-effort AI enrichment for a post, all from one AI call (two when
 * there's more than one image — see below): NSFW moderation classification
 * (for the blur/tap-to-view gate), topic tags and a quality score (feeds
 * the existing engagementScore ranking as a cold-start signal for posts
 * with no real engagement yet — see calculateEngagementScore in
 * reactions.ts), an accessibility alt-text description of the primary
 * image, and a text-toxicity flag for the caption (harassment/hate
 * speech/spam), independent of the image-based moderation status.
 *
 * Deliberately fails open: if no provider is configured or every provider
 * call fails, the post's moderationstatus simply stays 'pending' (renders
 * normally, unblurred) rather than the post creation itself failing or
 * content being wrongly hidden. This app had zero moderation before this,
 * so "sometimes unchecked" is strictly better than "never checked", not a
 * regression to guard against.
 */
export async function enrichPost(postId: string): Promise<void> {
  // The whole body is one try/catch, not just the AI-calling section —
  // this runs inside an after() callback from a post-creation Server
  // Action (sendPost / createGroupPost), so ANY unhandled throw here,
  // even from just creating the Supabase client or the initial fetch,
  // risks surfacing as "Post failed" on a post that had already actually
  // succeeded. Confirmed live: the original version left client creation
  // and the initial fetch outside the try/catch.
  try {
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

    // Main-composer posts store each media item's URL under `src`; group
    // posts (see GroupPostMediaItem in app/actions/groups.ts) use `url` —
    // both land in this same `posts` table, so this has to read/write
    // whichever key a given item actually has rather than assuming `src`.
    type MediaItem = { src?: string; url?: string; type: string; [key: string]: unknown };
    const media = (post.media as MediaItem[] | null) ?? [];
    const mediaUrl = (m: MediaItem) => m.src || m.url || "";

    const firstImage = mediaUrl(media.find(m => m.type === "image" && mediaUrl(m)) ?? { type: "" });
    const otherImages = media
      .filter(m => m.type === "image" && mediaUrl(m) && mediaUrl(m) !== firstImage)
      .map(mediaUrl);

    let enrichment: Enrichment;
    // Per-image alt text — previously only the first image ever got one,
    // leaving every other image in a multi-image post on a generic "Post
    // media N" fallback. Keyed by src so it can be written back onto each
    // matching media item below.
    const altTextBySrc = new Map<string, string>();

    if (firstImage) {
      const result = await analyzeImage({
        system: ENRICHMENT_SYSTEM_PROMPT,
        prompt: `Post caption: ${JSON.stringify((post.content as string) || "")}`,
        imageUrl: firstImage,
        maxTokens: 200,
      });
      enrichment = parseEnrichment(result.text);
      if (enrichment.altText) altTextBySrc.set(firstImage, enrichment.altText);

      // A multi-image post could have its NSFW image anywhere in the set,
      // not just the first — check the rest too (only runs when there's
      // more than one image) and let any "sensitive" finding win. Also
      // asks for each one's own alt text now, not just a moderation label.
      if (otherImages.length > 0) {
        const rest = await Promise.all(
          otherImages.map(imageUrl =>
            analyzeImage({
              system: ENRICHMENT_SYSTEM_PROMPT,
              prompt: `Post caption: ${JSON.stringify((post.content as string) || "")}`,
              imageUrl,
              maxTokens: 120,
            })
              .then(r => ({ imageUrl, parsed: parseEnrichment(r.text) }))
              .catch(err => {
                console.error("enrichPost: secondary image check failed", err);
                return null;
              })
          )
        );
        for (const r of rest) {
          if (!r) continue;
          if (r.parsed.altText) altTextBySrc.set(r.imageUrl, r.parsed.altText);
          if (r.parsed.moderation === "sensitive") {
            enrichment = { ...enrichment, moderation: "sensitive" };
          }
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

    const enrichedMedia = media.map(m => {
      const url = mediaUrl(m);
      return m.type === "image" && altTextBySrc.has(url)
        ? { ...m, alt: altTextBySrc.get(url) }
        : m;
    });

    await client
      .from("posts")
      .update({
        moderationstatus: enrichment.moderation,
        aitopics: enrichment.topics,
        aiqualityscore: enrichment.quality,
        // Kept for backward compatibility with existing readers that only
        // ever looked at the first image's alt text — enrichedMedia below
        // is the real, per-image source of truth going forward.
        aiimagealttext: enrichment.altText || null,
        texttoxic: enrichment.textToxic,
        media: enrichedMedia,
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
