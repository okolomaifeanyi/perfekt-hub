// Nwanne's awareness of group activity — deliberately mirrors the app's own
// existing access rule (see listGroupPosts in app/actions/groups.ts) rather
// than reinventing it: a group's posts are visible to Nwanne only in the
// exact cases they'd already be visible to the person chatting — full
// access for groups they're a member of, public-only posts for groups
// they're not (and nothing at all for a private group they haven't joined).
// The caller in app/actions/assistant.ts fetches through that same
// membership-aware function, so this module only formats what already
// passed that check.

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

export function isSafeGroupPost(post) {
  return !post?.textToxic && post?.moderationStatus !== "sensitive";
}

/**
 * @param {Array<{ groupName: string; posts: Array<{ authorUsername?: string; text?: string; media?: unknown[]; createdAt: unknown }> }>} groups
 * @returns {string | null}
 */
export function formatGroupsContext(groups) {
  if (!groups || groups.length === 0) return null;

  const sections = groups
    .map(({ groupName, posts }) => {
      const lines = (posts ?? [])
        .filter(post => post.text && post.text.trim())
        .map(post => {
          const author = post.authorUsername ? `@${post.authorUsername}` : "someone";
          const media = post.media && post.media.length > 0 ? " [with media]" : "";
          return `  ${author}: "${truncate(post.text, MAX_CONTENT_LENGTH)}"${media} — ${timeAgo(post.createdAt)}`;
        });
      if (lines.length === 0) return null;
      return `[Group: ${groupName}]\n${lines.join("\n")}`;
    })
    .filter(Boolean);

  return sections.length > 0 ? sections.join("\n\n") : null;
}
