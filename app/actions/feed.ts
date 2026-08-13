"use server";

import { cookies } from "next/headers";
import { firestoreAdmin } from "@/lib/supabase";
import { normalizeUnknownError } from "@/lib/supabase/error-utils.mjs";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { mergeFeedAuthorIds } from "@/lib/supabase/feed-author-ids.mjs";
import { runWithSupabaseClient } from "@/lib/supabase/request-context.mjs";
import { PostProps } from "@/lib/types";
import { Timestamp, type QueryDocumentSnapshot } from "@/lib/supabase";

void getCachedFeedAuthorIds;

// --- Types for cursor ---
type Cursor = number | null;
const canWarmOtherUsersFeedCache = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
);

async function withSupabaseRequestContext<T>(
  callback: () => Promise<T>
): Promise<T> {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: cookieUpdates => {
      cookieUpdates.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    },
  });

  // The @supabase/ssr server client initializes its session lazily
  // (skipAutoInitialize), so no JWT is attached until an auth method runs and
  // every query before that executes as the `anon` role. Hydrate it first so
  // RLS sees the real user.
  await supabase.auth.getUser();

  return runWithSupabaseClient(supabase, callback);
}

function normalizePost(
  doc: QueryDocumentSnapshot
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
    groupId: data.groupId ?? null,
    groupName: data.groupName ?? null,
    visibility: data.visibility ?? "public",
    // Add any other fields you use:
    lastSeen: toDate(data.lastSeen),
    // ... add more if needed
  } as PostProps;
}

/** ✅ Prewarm both users’ feed caches after relationship changes */
export async function prewarmFeeds(userA: string, userB: string) {
  if (!canWarmOtherUsersFeedCache) {
    return;
  }

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

  const merged = mergeFeedAuthorIds(userId, friendIds, followingIds);

  if (!canWarmOtherUsersFeedCache) {
    return merged;
  }

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

  if (metaSnap.exists()) {
    const data = metaSnap.data();
    if (Array.isArray(data?.feedAuthorIds)) {
      // ✅ Filter out empty, null, undefined, whitespace-only, duplicates
      const clean: string[] = Array.from(
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

async function getDirectFeedAuthorIds(userId: string): Promise<string[]> {
  const [friendIds, followingIds] = await Promise.all([
    getSubcollectionIds(userId, "friends"),
    getSubcollectionIds(userId, "following"),
  ]);

  return mergeFeedAuthorIds(userId, friendIds, followingIds);
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
  const authorIds = await getDirectFeedAuthorIds(currentUid);
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

  // Backfill: someone who follows few (or no) people would otherwise see a
  // near-empty or empty feed forever, even once real content exists on the
  // platform — top up the first page with popular posts from anyone until
  // their own network grows. Only on the first page (no cursor) so paging
  // through a feed stays a stable, non-repeating sequence.
  if (out.length < limit && before === null) {
    const backfillSnap = await firestoreAdmin
      .collection("posts")
      .orderBy("engagementScore", "desc")
      .limit(limit + out.length + 30)
      .get();

    for (const doc of backfillSnap.docs) {
      if (out.length >= limit) break;
      const post = normalizePost(doc);
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      out.push(post);
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
  try {
    return await withSupabaseRequestContext(() =>
      getFeedForUser(userId, {
        limit,
        before,
        parentPostId,
        onlyUser,
        sortMode,
      })
    );
  } catch (error) {
    console.error("getFeedAction failed:", normalizeUnknownError(error, "Unable to load feed."));
    return [];
  }
}

/** 🧩 Auto-refresh cache actions (to be called when friends/following change) */
export async function onFollowAction(
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  if (!canWarmOtherUsersFeedCache) {
    return;
  }

  await Promise.allSettled([
    refreshFeedCacheForUser(currentUserId),
    refreshFeedCacheForUser(targetUserId),
  ]);
}

export async function onUnfollowAction(
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  if (!canWarmOtherUsersFeedCache) {
    return;
  }

  await Promise.allSettled([
    refreshFeedCacheForUser(currentUserId),
    refreshFeedCacheForUser(targetUserId),
  ]);
}
