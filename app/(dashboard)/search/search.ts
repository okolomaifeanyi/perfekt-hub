import { db } from "@/lib/supabase";
import { PostProps, UserProps } from "@/lib/types";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  startAt,
  endAt,
  orderBy,
  DocumentData,
} from "@/lib/supabase";
import { generateText } from "@/lib/ai/client.mjs";
import { checkRateLimit } from "@/lib/rate-limit.mjs";

const EXPANSION_SYSTEM_PROMPT =
  "You expand a social-app search query into related single words for a " +
  "keyword search. Respond with ONLY a JSON array of 1-3 short lowercase " +
  "words or two-word phrases closely related to the query (synonyms, common " +
  "alternate terms) — not the original query itself, that's searched " +
  "separately. No markdown, no explanation. If the query is already " +
  "specific (a name, a very particular term), return an empty array rather " +
  "than forcing unrelated suggestions.";

// The underlying search is a prefix match on content_lowercase (Firestore-
// shim range query — see searchPosts below), not a "contains anywhere"
// search, so this can't fix that fundamentally: an expanded term only
// helps if some post happens to START with it. It's a real, if partial,
// improvement — "car" expanding to include "vehicle" catches a post
// starting with "Vehicle for sale..." that plain prefix matching on "car"
// never would. Fails silently to just the original term; search must
// never break or hang because the AI call did.
async function expandSearchTerms(term: string): Promise<string[]> {
  try {
    const result = await generateText({
      system: EXPANSION_SYSTEM_PROMPT,
      prompt: term,
      maxTokens: 60,
    });
    const cleaned = result.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [term];
    const extra = parsed
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .map(t => t.trim().toLowerCase())
      .filter(t => t !== term)
      .slice(0, 3);
    return [term, ...extra];
  } catch (err) {
    console.error("expandSearchTerms failed, falling back to literal term:", err);
    return [term];
  }
}

type SearchSnapshot = {
  docs: DocumentData[];
  size: number;
};

const normalize = (s: string) => s.toLowerCase().trim();

export async function searchUsersAndPosts(searchTerm: string) {
  const term = normalize(searchTerm);
  if (!term) return { users: [], posts: [] };

  // The Discover page (which calls this on every render, including for
  // signed-out visitors since guest browsing shipped) and the search API
  // route both reach this — protect it the same way as the public feed.
  if (!(await checkRateLimit("search", 30, 60))) return { users: [], posts: [] };

  // Expansion only applies to post content, not usernames/names — a person
  // search should stay literal, "synonyms" for a name make no sense.
  const [usersSnap, expandedTerms] = await Promise.all([
    searchUsers(term),
    expandSearchTerms(term),
  ]);
  const postsSnap = await searchPosts(expandedTerms);

  const users = usersSnap.docs.map(mapUserDoc);
  const posts = postsSnap.docs.map(mapPostDoc);

  // console.log({ users, posts });

  return { users, posts };
}

/* ------------------- USERS ------------------- */
async function searchUsers(term: string) {
  const usersRef = collection(db, "users");

  const queries = [
    // username (already lowercase-safe if you store it that way)
    query(
      usersRef,
      where("username", ">=", term),
      where("username", "<=", term + "\uf8ff"),
      limit(10)
    ),
    // fullName_lowercase
    query(
      usersRef,
      where("fullName_lowercase", ">=", term),
      where("fullName_lowercase", "<=", term + "\uf8ff"),
      limit(10)
    ),
    // email
    query(
      usersRef,
      where("email", ">=", term),
      where("email", "<=", term + "\uf8ff"),
      limit(10)
    ),
  ];

  const [s1, s2, s3] = await Promise.all(queries.map(q => getDocs(q)));

  const seen = new Set<string>();
  const docs: DocumentData[] = [];

  for (const snap of [s1, s2, s3]) {
    for (const doc of snap.docs) {
      if (!seen.has(doc.id)) {
        seen.add(doc.id);
        docs.push(doc);
      }
    }
  }

  return { docs: docs.slice(0, 10), size: docs.length } as SearchSnapshot;
}

/* ------------------- POSTS ------------------- */
async function searchPosts(terms: string[]) {
  const postsRef = collection(db, "posts");

  const snapshots = await Promise.all(terms.map(term => searchPostsForTerm(postsRef, term)));

  const seen = new Set<string>();
  const docs: DocumentData[] = [];
  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      if (!seen.has(doc.id)) {
        seen.add(doc.id);
        docs.push(doc);
      }
    }
  }

  return { docs: docs.slice(0, 15), size: docs.length } as SearchSnapshot;
}

async function searchPostsForTerm(postsRef: ReturnType<typeof collection>, term: string) {
  const q = query(
    postsRef,
    orderBy("content_lowercase"),
    startAt(term),
    endAt(term + "\uf8ff"),
    limit(15)
  );

  const snapshot = await getDocs(q);
  // console.log(`[searchPosts] Term: "${term}" → ${snapshot.size} posts`);

  return { docs: snapshot.docs, size: snapshot.size } as SearchSnapshot;
}

/* ------------------- MAPPERS ------------------- */
function mapUserDoc(doc: DocumentData): UserProps {
  const d = doc.data();
  return {
    uid: doc.id,
    username: d.username ?? "",
    fullName: d.fullName ?? "",
    email: d.email ?? "",
    photoURL: d.photoURL ?? undefined,
  };
}

function mapPostDoc(doc: DocumentData): PostProps {
  const d = doc.data();
  return {
    id: doc.id,
    userId: d.userId ?? "",
    content: d.content ?? "",
    media: d.media ?? [],
    createdAt: d.createdAt?.toDate?.() ?? null,
    username: d.username ?? "",
    userFullName: d.userFullName ?? "",
    userPhotoURL: d.userPhotoURL ?? null,
    quotePostId: d.quotePostId ?? null,
    linkPreview: d.linkPreview ?? null,
  };
}
