"use server"

import { firestoreAdmin } from "@/lib/firebaseAdmin";
import { PostProps } from "@/lib/types";
const IN_QUERY_LIMIT = 10; // Firestore "in" supports max 10

/** Helper: read all ids from a user's subcollection (friends / following) */
async function getSubcollectionIds(
  userId: string,
  subcollection: "friends" | "following"
) {
  const snap = await firestoreAdmin
    .collection(`users/${userId}/${subcollection}`)
    .get();
  return snap.docs.map(d => d.id);
}

interface FeedOpts {
  limit?: number;
  before?: number; // timestamp cursor
}

/**
 * Get feed posts for a user.
 * - Fetches friends + following + self
 * - Supports cursor-based pagination via `before`
 * - Merges chunked "in" queries server-side
 */
export async function getFeedForUser(currentUid: string, opts: FeedOpts = {}) {
  const limit = opts.limit ?? 20;
  const before = opts.before ?? null;

  // 1) gather author ids
  const [friendIds, followingIds] = await Promise.all([
    getSubcollectionIds(currentUid, "friends"),
    getSubcollectionIds(currentUid, "following"),
  ]);

  const idSet = new Set<string>([currentUid, ...friendIds, ...followingIds]);
  const authorIds = Array.from(idSet);

  if (authorIds.length === 0) return [];

  // 2) chunk into groups ≤ IN_QUERY_LIMIT
  const chunks: string[][] = [];
  for (let i = 0; i < authorIds.length; i += IN_QUERY_LIMIT) {
    chunks.push(authorIds.slice(i, i + IN_QUERY_LIMIT));
  }

  // 3) run queries in parallel
  const queries = chunks.map(chunk => {
    let q = firestoreAdmin
      .collection("posts")
      .where("userId", "in", chunk)
      .orderBy("createdAt", "desc");

    if (before) {
      q = q.where("createdAt", "<", new Date(before));
    }

    return q.limit(limit).get();
  });

  const snaps = await Promise.all(queries);

  // 4) merge, dedupe, sort, and take top `limit`
  const posts: PostProps[] = [];

  for (const snap of snaps) {
    for (const doc of snap.docs) {
      const data = doc.data();
      posts.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
      } as PostProps);
    }
  }

  posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());


  const seen = new Set<string>();
  const out: typeof posts = [];
  for (const p of posts) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
      if (out.length >= limit) break;
    }
  }

  return out;
}

export async function getFeedAction(
  userId: string,
  limit = 20,
  before?: number
) {
  return await getFeedForUser(userId, { limit, before });
}
