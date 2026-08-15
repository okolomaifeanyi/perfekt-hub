// Routes a signed-out visitor can land on and actually see content —
// everything else keeps redirecting to login exactly as before. Deliberately
// a short, explicit allowlist rather than a "block a few, allow the rest"
// rule: getting this wrong in the permissive direction would expose a page
// that assumes `user` is never null.
const PUBLIC_EXACT_PATHS = new Set(["/", "/discover", "/updates"]);

// Matches a post detail page (/[username]/[postId]) without also matching
// other two-segment routes under a username, like /[username]/followers or
// /[username]/videos — post ids in this app are UUIDs, those aren't.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPublicPath(pathname) {
  if (!pathname) return false;
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 2 && UUID_PATTERN.test(segments[1])) return true;

  return false;
}
