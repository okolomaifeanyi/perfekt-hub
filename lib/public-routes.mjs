// Routes a signed-out visitor can land on and actually see content —
// everything else keeps redirecting to login exactly as before. Deliberately
// a short, explicit allowlist rather than a "block a few, allow the rest"
// rule: getting this wrong in the permissive direction would expose a page
// that assumes `user` is never null.
const PUBLIC_EXACT_PATHS = new Set(["/", "/discover", "/updates", "/articles"]);

// Matches a post detail page (/[username]/[postId]) without also matching
// other two-segment routes under a username, like /[username]/followers or
// /[username]/videos — post ids in this app are UUIDs, those aren't.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Words that can never be a real username in this app's second path
// segment under /articles/ — reserved so a *future* 3-segment article
// route (e.g. /articles/edit/[id]) can't accidentally slip through this
// allowlist just because it happens to match the "3 segments starting with
// articles" shape. /articles/compose itself doesn't need an entry here —
// it's only 2 segments, so the length check below already excludes it.
const ARTICLES_RESERVED_SEGMENTS = new Set(["edit", "new", "drafts", "compose"]);

export function isPublicPath(pathname) {
  if (!pathname) return false;
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 2 && UUID_PATTERN.test(segments[1])) return true;

  // An article detail page (/articles/[username]/[slug]) is public the
  // same way a post detail page is — whether the specific article is
  // actually visible to this visitor (published vs. someone else's draft)
  // is still enforced by RLS/getArticleBySlug, not by this allowlist. This
  // only needs to admit the URL shape past the login redirect.
  if (
    segments.length === 3 &&
    segments[0] === "articles" &&
    !ARTICLES_RESERVED_SEGMENTS.has(segments[1])
  ) {
    return true;
  }

  return false;
}
