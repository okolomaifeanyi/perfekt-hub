// Nwanne's awareness of what people are actually posting on Perfekthub —
// deliberately scoped to the exact same pool a signed-out guest already
// sees on the public home feed (see getPublicFeedForGuests in
// app/actions/feed.ts): top-level, non-group posts. Regular posts have no
// enforced visibility restriction in this app (confirmed against the
// codebase — only group posts and polls check a visibility field), so this
// is not a privacy expansion, just handing the model the same "public"
// boundary the rest of the app already draws. Replies, DMs, and any
// account-specific data are never included here.

function truncate(text, maxLength) {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

function timeAgo(createdAt) {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "recently";
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const MAX_CONTENT_LENGTH = 200;

/**
 * @param {Array<{ username?: string; content?: string; media?: unknown[]; createdAt: unknown }>} posts
 * @returns {string | null}
 */
export function formatPostsContext(posts) {
  if (!posts || posts.length === 0) return null;

  const lines = posts
    .filter(post => post.content && post.content.trim())
    .map(post => {
      const author = post.username ? `@${post.username}` : "someone";
      const media = post.media && post.media.length > 0 ? " [with media]" : "";
      return `${author}: "${truncate(post.content, MAX_CONTENT_LENGTH)}"${media} — ${timeAgo(post.createdAt)}`;
    });

  return lines.length > 0 ? lines.join("\n") : null;
}

// Flagged content shouldn't get repeated/amplified by the assistant even
// though it's technically part of the same "public" pool — a passive feed
// rendering it is different from an LLM actively restating it in a new
// context.
export function isSafeToShare(post) {
  return !post?.textToxic && post?.moderationStatus !== "sensitive";
}
