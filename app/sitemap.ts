import type { MetadataRoute } from "next";

import { appInfo } from "@/lib/appInfo";
import { getPublicFeedForGuests } from "@/app/actions/feed";

// Matches lib/public-routes.mjs's isPublicPath() allowlist — the only pages
// a signed-out visitor actually lands on and sees content, rather than
// getting redirected to /login. /login and /signup are reachable
// unauthenticated too, but they're not content worth indexing.
const staticRoutes = ["/", "/discover", "/updates"] as const;

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

  // getPublicFeedForGuests already enforces the same "what can a signed-out
  // visitor see" boundary a sitemap needs — reusing it here instead of
  // re-deriving that visibility rule. Failing closed (static routes only)
  // rather than throwing, since a transient data error shouldn't take the
  // whole sitemap down.
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

  return [...staticEntries, ...postEntries];
}
