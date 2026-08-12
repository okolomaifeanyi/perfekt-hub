import { buildCanonicalPostUrl, buildVideoPostUrl } from "./video-url.mjs";
import { buildSiteMetadata } from "./site-metadata.mjs";

export function buildVideoMetadata({ username, postId, title, description, image }) {
  const canonical = buildCanonicalPostUrl(username, postId);
  const videoUrl = buildVideoPostUrl(username, postId);
  const baseMetadata = buildSiteMetadata({
    canonical,
    title,
    description,
    image,
  });

  return {
    ...baseMetadata,
    title,
    description,
    alternates: { canonical },
    openGraph: {
      ...baseMetadata.openGraph,
      url: videoUrl,
      images: image ? [{ url: image }] : [],
    },
  };
}
