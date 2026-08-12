const DEFAULT_SITE_URL = process.env.APP_URL || "http://localhost:3000";

export function buildSiteMetadata({
  canonical,
  title,
  description,
  image = undefined,
}) {
  const canonicalUrl = new URL(canonical, DEFAULT_SITE_URL);
  const metadataBase = new URL(canonicalUrl.origin);

  return {
    metadataBase,
    alternates: {
      canonical: canonicalUrl.pathname + canonicalUrl.search + canonicalUrl.hash,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      images: image ? [{ url: image }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}
