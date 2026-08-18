import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve("supabase/migrations/20260818000000_add_match_analysis_category.sql");

test("match_analysis category migration extends the check constraint without dropping existing categories", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /drop constraint curated_content_category_check/i);
  assert.match(sql, /add constraint curated_content_category_check/i);
  assert.match(sql, /'match_analysis'/);

  // The original 14 categories must still all be present — this is an
  // extension, not a replacement.
  for (const category of [
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
  ]) {
    assert.match(sql, new RegExp(`'${category}'`));
  }
});
