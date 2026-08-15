import { getSupabaseAdminClient } from "@/lib/supabase/client";

// Mirrors the `category` check constraint in
// supabase/migrations/20260815030000_curated_content.sql — kept here too so
// an ingestion route passing a typo'd category fails fast in application
// code with a clear error, instead of surfacing as a raw Postgres
// constraint-violation message.
export const CURATED_CONTENT_CATEGORIES = [
  "football_fixture",
  "football_live",
  "football_result",
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
export async function upsertCuratedContent(items) {
  if (items.length === 0) return { inserted: 0, upserted: 0 };

  for (const item of items) {
    if (!CURATED_CONTENT_CATEGORIES.includes(item.category)) {
      throw new Error(`upsertCuratedContent: unknown category "${item.category}"`);
    }
  }

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

  return { inserted: withoutExternalId.length, upserted: withExternalId.length };
}
