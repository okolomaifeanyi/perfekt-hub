import type { MetadataRoute } from "next";

import { appInfo } from "@/lib/appInfo";
import { getPublicFeedForGuests } from "@/app/actions/feed";
import { listPublishedArticleSlugsForSitemap } from "@/app/actions/articles";

// Only routes a signed-out visitor can actually land on and see content —
// see lib/public-routes.mjs's isPublicPath, the single source of truth
// this list should track. A login-gated route doesn't belong here: a
// crawler that follows it just gets redirected to /login instead of
// indexing anything, which wastes crawl budget and sends a confusing
// signal about what the page is.
const staticRoutes = ["/", "/discover", "/updates", "/articles"] as const;

// Bounded so a burst of new posts can't blow up sitemap generation time —
// the most recent public posts are what's worth surfacing to crawlers
// anyway, not the entire history.
const MAX_POST_URLS = 200;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = new URL(appInfo.url);
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map(path => ({
    url: new URL(path, baseUrl).toString(),
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));

  // A missing/misconfigured Supabase env, or a failure in either content
  // source, would otherwise take the whole sitemap down with it — better
  // to ship the static routes above than a 500 that drops every URL from
  // search indexing. The two sources are independent, so one failing
  // doesn't cost the other its entries.

  // getPublicFeedForGuests already enforces the same "what can a
  // signed-out visitor see" boundary a sitemap needs — reused instead of
  // re-deriving that rule.
  let postEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await getPublicFeedForGuests({ limit: MAX_POST_URLS });
    postEntries = posts
      .filter(post => post.username)
      .map(post => ({
        url: new URL(`/${post.username}/${post.id}`, baseUrl).toString(),
        lastModified: post.createdAt,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      }));
  } catch (error) {
    console.error("sitemap: failed to load public posts", error);
  }

  let articleEntries: MetadataRoute.Sitemap = [];
  try {
    const articles = await listPublishedArticleSlugsForSitemap();
    articleEntries = articles.map(({ username, slug, updatedAt }) => ({
      url: new URL(`/articles/${username}/${slug}`, baseUrl).toString(),
      lastModified: new Date(updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch (err) {
    console.error("sitemap: failed to load published articles", err);
  }

  return [...staticEntries, ...postEntries, ...articleEntries];
}
