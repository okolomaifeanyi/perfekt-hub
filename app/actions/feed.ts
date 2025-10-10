"use server";

import { firestoreAdmin } from "@/lib/firebaseAdmin";
import { PostProps } from "@/lib/types";
import { Timestamp } from "firebase-admin/firestore";

// --- Types for cursor ---
type Cursor = number | null;

/** ✅ Prewarm both users’ feed caches after relationship changes */
export async function prewarmFeeds(userA: string, userB: string) {
  await Promise.allSettled([
    refreshFeedCacheForUser(userA),
    refreshFeedCacheForUser(userB),
  ]);
}

const IN_QUERY_LIMIT = 10; // Firestore "in" supports max 10

/** Helper: read only document IDs from a user's subcollection */
async function getSubcollectionIds(
  userId: string,
  subcollection: "friends" | "following"
): Promise<string[]> {
  const snap = await firestoreAdmin
    .collection(`users/${userId}/${subcollection}`)
    .select() // ✅ only retrieve document IDs (faster)
    .get();

  return snap.docs.map(d => d.id);
}

/** ✅ Centralized cache refresh logic — call this when friends/following change */
export async function refreshFeedCacheForUser(
  userId: string
): Promise<string[]> {
  const [friendIds, followingIds] = await Promise.all([
    getSubcollectionIds(userId, "friends"),
    getSubcollectionIds(userId, "following"),
  ]);

  const merged = Array.from(new Set([userId, ...friendIds, ...followingIds]));

  const metaRef = firestoreAdmin.doc(`users/${userId}/meta/feed`);
  await metaRef.set(
    { feedAuthorIds: merged, updatedAt: new Date() },
    { merge: true }
  );

  return merged;
}

/** Helper: get merged friend + following IDs, cached under users/{uid}/meta/feed */
async function getCachedFeedAuthorIds(userId: string): Promise<string[]> {
  const metaRef = firestoreAdmin.doc(`users/${userId}/meta/feed`);
  const metaSnap = await metaRef.get();

  if (metaSnap.exists) {
    const data = metaSnap.data();
    if (data?.feedAuthorIds && Array.isArray(data.feedAuthorIds)) {
      return data.feedAuthorIds;
    }
  }

  // Build fresh & cache if not found
  const ids = await refreshFeedCacheForUser(userId);
  return ids;
}

/** 🧩 Main feed loader */
export async function getFeedForUser(
  currentUid: string,
  opts: {
    limit?: number;
    parentPostId?: string | null;
    onlyUser?: boolean;
    sortMode?: "latest" | "trending";
    before?: Cursor;
  } = {}
): Promise<PostProps[]> {
  const limit = opts.limit ?? 20;
  const before = opts.before ?? null;
  const parentPostId = opts.parentPostId ?? null;
  const onlyUser = opts.onlyUser ?? false;
  const sortMode = opts.sortMode ?? "latest";

  // --- 1️⃣ Replies/comments feed
  if (parentPostId) {
    let q = firestoreAdmin
      .collection("posts")
      .where("parentPostId", "==", parentPostId)
      .orderBy("createdAt", "desc");

    if (before !== null) q = q.startAfter(new Date(before));
    q = q.limit(limit);

    const snap = await q.get();
    return snap.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
          createdAt: (doc.data().createdAt as Timestamp).toDate(),
          engagementScore: doc.data().engagementScore ?? 0,
        } as PostProps)
    );
  }

  // --- 2️⃣ User-only feed
  if (onlyUser) {
    const queryLimit = sortMode === "trending" ? limit * 10 : limit;
    let q = firestoreAdmin
      .collection("posts")
      .where("userId", "==", currentUid)
      .orderBy("createdAt", "desc");

    if (before !== null) {
      q = q.startAfter(new Date(before));
    }

    q = q.limit(queryLimit);
    const snap = await q.get();
    const results = snap.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
          createdAt: (doc.data().createdAt as Timestamp).toDate(),
          engagementScore: doc.data().engagementScore ?? 0,
        } as PostProps)
    );

    if (sortMode === "trending") {
      results.sort((a, b) => {
        const scoreDiff = (b.engagementScore ?? 0) - (a.engagementScore ?? 0);
        return scoreDiff !== 0
          ? scoreDiff
          : b.createdAt.getTime() - a.createdAt.getTime();
      });
    }

    return results.slice(0, limit);
  }

  // --- 3️⃣ Main home feed
  const authorIds = await getCachedFeedAuthorIds(currentUid);
  if (authorIds.length === 0) return [];

  // Split into Firestore "in" chunks
  const chunks: string[][] = [];
  for (let i = 0; i < authorIds.length; i += IN_QUERY_LIMIT) {
    chunks.push(authorIds.slice(i, i + IN_QUERY_LIMIT));
  }

  const posts: PostProps[] = [];

  const chunkLimit = sortMode === "trending" ? limit * 10 : limit;

  // Parallel + fault-tolerant fetching
  await Promise.allSettled(
    chunks.map(async chunk => {
      let q = firestoreAdmin.collection("posts").where("userId", "in", chunk);

      q = q.orderBy("createdAt", "desc");
      if (before !== null) {
        q = q.startAfter(new Date(before));
      }

      q = q.limit(chunkLimit);

      const snap = await q.get();
      for (const doc of snap.docs) {
        const data = doc.data();
        posts.push({
          id: doc.id,
          ...data,
          createdAt: (data.createdAt as Timestamp).toDate(),
          engagementScore: data.engagementScore ?? 0,
        } as PostProps);
      }
    })
  );

  // ✅ Sort all results together in memory
  posts.sort((a, b) => {
    if (sortMode === "trending") {
      const scoreDiff = (b.engagementScore ?? 0) - (a.engagementScore ?? 0);
      return scoreDiff !== 0
        ? scoreDiff
        : b.createdAt.getTime() - a.createdAt.getTime();
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  // ✅ Deduplicate & limit *after* all fetches and sorting are complete
  const seen = new Set<string>();
  const out: PostProps[] = [];
  for (const p of posts) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
      if (out.length >= limit) break;
    }
  }

  return out;
}

/** Main server action wrapper */
export async function getFeedAction(
  userId: string,
  limit = 20,
  before: Cursor = null,
  parentPostId: string | null = null,
  onlyUser = false,
  sortMode: "latest" | "trending" = "latest"
): Promise<PostProps[]> {
  return await getFeedForUser(userId, {
    limit,
    before,
    parentPostId,
    onlyUser,
    sortMode,
  });
}

/** 🧩 Auto-refresh cache actions (to be called when friends/following change) */
export async function onFollowAction(
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  await Promise.allSettled([
    refreshFeedCacheForUser(currentUserId),
    refreshFeedCacheForUser(targetUserId),
  ]);
}

export async function onUnfollowAction(
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  await Promise.allSettled([
    refreshFeedCacheForUser(currentUserId),
    refreshFeedCacheForUser(targetUserId),
  ]);
}
