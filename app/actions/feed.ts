"use server";

import { firestoreAdmin } from "@/lib/firebaseAdmin";
import { PostProps } from "@/lib/types";
import { Timestamp } from "firebase-admin/firestore";

// --- Types for cursor ---
type Cursor = number | null;

function normalizePost(
  doc: FirebaseFirestore.QueryDocumentSnapshot
): PostProps {
  const data = doc.data();
  const id = doc.id;

  // Convert ALL Timestamps to Date
  const toDate = (ts: unknown): Date => {
    if (!ts) return new Date(0);
    if (ts instanceof Timestamp) return ts.toDate();
    if (typeof ts === "object" && ts && "toDate" in ts)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (ts as any).toDate();
    if (typeof ts === "number") return new Date(ts);
    if (typeof ts === "string") {
      const d = new Date(ts);
      return isNaN(d.getTime()) ? new Date(0) : d;
    }
    return new Date(0);
  };

  return {
    id,
    userId: data.userId ?? "",
    username: data.username ?? "",
    content: data.content ?? "",
    media: data.media ?? [],
    createdAt: toDate(data.createdAt),
    userPhotoURL: data.userPhotoURL ?? "",
    userFullName: data.userFullName ?? "",
    parentPostId: data.parentPostId ?? "",
    quotePostId: data.quotePostId ?? null,
    replyCount: data.replyCount ?? 0,
    quoteCount: data.quoteCount ?? 0,
    linkPreview: data.linkPreview ?? {},
    viewCount: data.viewCount ?? 0,
    engagementScore: data.engagementScore ?? 0,
    engagementUpdatedAt: toDate(data.engagementUpdatedAt),
    // Add any other fields you use:
    lastSeen: toDate(data.lastSeen),
    // ... add more if needed
  } as PostProps;
}

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
    if (Array.isArray(data?.feedAuthorIds)) {
      // ✅ Filter out empty, null, undefined, whitespace-only, duplicates
      const clean = Array.from(
        new Set(
          data.feedAuthorIds.filter(
            (id: unknown): id is string =>
              typeof id === "string" && id.trim() !== ""
          )
        )
      );

      // Optional: Write back cleaned array to Firestore to fix it permanently
      if (clean.length !== data.feedAuthorIds.length) {
        await metaRef.update({ feedAuthorIds: clean });
      }

      return clean;
    }
  }

  // 🔁 Build fresh cache if not found
  const ids = await refreshFeedCacheForUser(userId);

  // ✅ Apply same cleaning logic before returning
  return Array.from(
    new Set(
      ids.filter(
        (id: unknown): id is string =>
          typeof id === "string" && id.trim() !== ""
      )
    )
  );
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
    return snap.docs.map(normalizePost);
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
    const results = snap.docs.map(normalizePost);

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
        // const data = doc.data();
        posts.push(normalizePost(doc));
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
