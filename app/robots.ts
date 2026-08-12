import type { MetadataRoute } from "next";

import { appInfo } from "@/lib/appInfo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = new URL(appInfo.url);

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: new URL("/sitemap.xml", baseUrl).toString(),
    host: baseUrl.toString(),
  };
}
