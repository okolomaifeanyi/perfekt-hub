import { getRelationshipTarget } from "../supabase/relationship.mjs";

export function getUsersTarget(segments) {
  const [root, one, two, three] = segments;

  if (root !== "users") {
    return null;
  }

  if (segments.length === 1 || segments.length === 2) {
    return { table: "users", idColumn: "uid", baseFilters: [] };
  }

  const relationshipTarget = getRelationshipTarget(segments);
  if (relationshipTarget) {
    return {
      table: relationshipTarget.table,
      idColumn: relationshipTarget.idColumn,
      baseFilters: relationshipTarget.baseFilters,
      relationship: relationshipTarget,
    };
  }

  if (two === "notifications") {
    return {
      table: "notifications",
      idColumn: "id",
      baseFilters: [{ field: "recipientUid", op: "==", value: one }],
    };
  }

  if (two === "meta" && three === "feed") {
    return {
      table: "user_meta",
      idColumn: "id",
      baseFilters: [
        { field: "uid", op: "==", value: one },
        { field: "key", op: "==", value: "feed" },
      ],
    };
  }

  if (two === "savedPosts") {
    return {
      table: "saved_posts",
      idColumn: "id",
      baseFilters: [{ field: "uid", op: "==", value: one }],
    };
  }

  // Unrecognized subcollection path (e.g. "groups", which has no real table
  // backing it yet). Point at a table that doesn't exist so callers get a
  // clear "relation does not exist" error and an honest empty state, instead
  // of silently falling back to the top-level users table and leaking every
  // user's row into whatever UI queried this path as if it were the
  // requested list.
  return { table: "unsupported_subcollection", idColumn: "id", baseFilters: [] };
}
