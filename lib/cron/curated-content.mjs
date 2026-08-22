import { getSupabaseAdminClient } from "@/lib/supabase/client";
import { filterUnsafeCuratedContent } from "@/lib/curated-content-safety.mjs";

// Mirrors the `category` check constraint in
// supabase/migrations/20260815030000_curated_content.sql (extended by
// 20260816010000_add_football_news_category.sql,
// 20260818000000_add_match_analysis_category.sql, and
// 20260822000000_add_match_summary_category.sql) — kept here too so an
// ingestion route passing a typo'd category fails fast in application code
// with a clear error, instead of surfacing as a raw Postgres
// constraint-violation message.
export const CURATED_CONTENT_CATEGORIES = [
  "football_fixture",
  "football_live",
  "football_result",
  "football_news",
  "crypto_price",
  "crypto_news",
  "betting_prediction",
  "movie_news",
  "music_news",
  "gossip_news",
  "video_trending",
  "education_news",
  "tech_news",
  "fraud_alert",
  "match_analysis",
  "match_summary",
];

const UPSERT_CHUNK_SIZE = 500;

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// `items` without an external_id (nothing to dedup against) go through
// plain insert — upserting them through the same (category, external_id)
// conflict target wouldn't collide with each other (Postgres never treats
// null = null in a unique index) but would silently no-op past ON CONFLICT
// DO UPDATE with no matching row to update, which reads as "it worked" while
// doing nothing.
export async function upsertCuratedContent(rawItems) {
  if (rawItems.length === 0) return { inserted: 0, upserted: 0, rejected: 0 };

  for (const item of rawItems) {
    if (!CURATED_CONTENT_CATEGORIES.includes(item.category)) {
      throw new Error(`upsertCuratedContent: unknown category "${item.category}"`);
    }
  }

  // Same link-safety check posts run before they're allowed to share a URL
  // (see isSafeLink) plus a hand-maintained domain blocklist — run here so a
  // dangerous source never makes it into the table in the first place, not
  // just filtered out of reads after the fact.
  const { safeItems: items, rejected } = await filterUnsafeCuratedContent(rawItems);
  if (rejected.length > 0) {
    console.warn(
      `upsertCuratedContent: rejected ${rejected.length} unsafe link(s)`,
      rejected
    );
  }
  if (items.length === 0) return { inserted: 0, upserted: 0, rejected: rejected.length };

  const admin = getSupabaseAdminClient();
  const withExternalId = items.filter(item => item.external_id);
  const withoutExternalId = items.filter(item => !item.external_id);

  for (const batch of chunk(withExternalId, UPSERT_CHUNK_SIZE)) {
    const { error } = await admin
      .from("curated_content")
      .upsert(batch, { onConflict: "category,external_id" });
    if (error) throw new Error(`upsertCuratedContent (upsert): ${error.message}`);
  }

  for (const batch of chunk(withoutExternalId, UPSERT_CHUNK_SIZE)) {
    const { error } = await admin.from("curated_content").insert(batch);
    if (error) throw new Error(`upsertCuratedContent (insert): ${error.message}`);
  }

  return {
    inserted: withoutExternalId.length,
    upserted: withExternalId.length,
    rejected: rejected.length,
  };
}
