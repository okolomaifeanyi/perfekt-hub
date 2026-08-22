import type { MetadataRoute } from "next";

import { appInfo } from "@/lib/appInfo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = new URL(appInfo.url);

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Everything not in lib/public-routes.mjs's isPublicPath() allowlist
      // 302s an anonymous visitor to /login anyway — disallowing these
      // explicitly stops crawlers that ignore redirects from repeatedly
      // hitting private-data routes.
      disallow: [
        "/watch",
        "/discover/events",
        "/discover/match",
        "/discover/saves",
        "/discover/products",
        "/calendar",
        "/messages",
        "/notifications",
        "/settings",
        "/group",
      ],
    },
    sitemap: new URL("/sitemap.xml", baseUrl).toString(),
    host: baseUrl.toString(),
  };
}
