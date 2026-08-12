export const VIDEO_QUALITIES = ["auto", "high", "medium", "low"];

const QUALITY_TRANSFORMS = {
  auto: "q_auto",
  high: "q_auto:best",
  medium: "q_auto:good",
  low: "q_auto:low",
};

const CLOUDINARY_UPLOAD_MARKER = "/video/upload/";

export function isCloudinaryVideoUrl(url) {
  return typeof url === "string" && url.includes(CLOUDINARY_UPLOAD_MARKER);
}

// Cloudinary applies transformations placed right after "/video/upload/" in
// the delivery URL, e.g. ".../video/upload/q_auto:low/v123/clip.mp4". Videos
// from any other host are returned unchanged — there's no generic way to
// request a different quality from an arbitrary URL.
export function applyVideoQuality(url, quality) {
  if (!isCloudinaryVideoUrl(url)) return url;

  const transform = QUALITY_TRANSFORMS[quality] ?? QUALITY_TRANSFORMS.auto;
  const markerIndex = url.indexOf(CLOUDINARY_UPLOAD_MARKER) + CLOUDINARY_UPLOAD_MARKER.length;
  const before = url.slice(0, markerIndex);
  let after = url.slice(markerIndex);

  // Strip any quality transform already present (e.g. re-applying a
  // different quality) so they don't stack.
  after = after.replace(/^q_[a-z0-9_:]+\//i, "");

  return `${before}${transform}/${after}`;
}
