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

type SearchSnapshot = {
  docs: DocumentData[];
  size: number;
};

const normalize = (s: string) => s.toLowerCase().trim();

export async function searchUsersAndPosts(searchTerm: string) {
  const term = normalize(searchTerm);
  if (!term) return { users: [], posts: [] };

  const [usersSnap, postsSnap] = await Promise.all([
    searchUsers(term),
    searchPosts(term),
  ]);

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
async function searchPosts(term: string) {
  const postsRef = collection(db, "posts");

  const q = query(
    postsRef,
    orderBy("content_lowercase"),
    startAt(term),
    endAt(term + "\uf8ff"),
    limit(15)
  );

  const snapshot = await getDocs(q);
  // console.log(`[searchPosts] Term: "${term}" â†’ ${snapshot.size} posts`);

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
