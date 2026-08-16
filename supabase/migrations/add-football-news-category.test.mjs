import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve("supabase/migrations/20260816010000_add_football_news_category.sql");

test("football_news category migration extends the check constraint without dropping existing categories", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /drop constraint curated_content_category_check/i);
  assert.match(sql, /add constraint curated_content_category_check/i);
  assert.match(sql, /'football_news'/);

  // The original 13 categories must still all be present — this is an
  // extension, not a replacement.
  for (const category of [
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
  ]) {
    assert.match(sql, new RegExp(`'${category}'`));
  }
});
