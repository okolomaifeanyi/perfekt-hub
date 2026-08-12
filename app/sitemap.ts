import type { MetadataRoute } from "next";

import { appInfo } from "@/lib/appInfo";

const staticRoutes = [
  "/",
  "/watch",
  "/discover",
  "/discover/events",
  "/discover/match",
  "/calendar",
  "/messages",
  "/notifications",
  "/settings",
  "/signup",
  "/login",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = new URL(appInfo.url);
  const now = new Date();

  return staticRoutes.map(path => ({
    url: new URL(path, baseUrl).toString(),
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
