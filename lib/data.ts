import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit as limitFn,
  startAfter,
} from "firebase/firestore";
import {
  PostProps,
  // UserProps,
} from "./types";

// Get a single user
// async function getUser(userId: string): Promise<UserProps | null> {
//   const userDoc = await getDoc(doc(db, "users", userId));
//   return userDoc.exists() ? (userDoc.data() as UserProps) : null;
// }

// Get comments for a post
// async function getComments(postId: string): Promise<CommentProps[]> {
//   const q = query(collection(db, "comments"), where("postId", "==", postId));
//   const snapshot = await getDocs(q);
//   return snapshot.docs.map(doc => doc.data() as CommentProps);
// }

// Fetch all posts
export async function getInitialPosts(limit = 10) {
  const q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc"),
    limitFn(limit),
    where("parentPostId", "==", "")
  );
  const snapshot = await getDocs(q);
  const posts = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
    id: doc.id,
    userId: data.userId,
    content: data.content,
    media: data.media || [],
    createdAt: data.createdAt?.toDate().toISOString() ?? null,
    username: data.username,
    userFullName: data.userFullName || "",
    userPhotoURL: data.userPhotoURL,
    }
  }) as PostProps[];
  
  return posts;
}

// Get more posts with pagination
export async function getMorePosts(lastDoc: number, limit = 10) {
  const q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc"),
    startAfter(lastDoc),
    limitFn(limit),
    where("parentPostId", "==", "")
  );
  const snapshot = await getDocs(q);
  const posts = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      content: data.content,
      media: data.media || [],
      createdAt: data.createdAt?.toDate().toISOString() ?? null,
      username: data.username,
      userFullName: data.userFullName || "",
      userPhotoURL: data.userPhotoURL,
    };
  }) as PostProps[];
  return posts;
}

// Get posts by user
export async function getInitialUserPosts(
  userId: string,
  limit = 10,
) {
  const q = query(
    collection(db, "posts"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limitFn(limit));
  
  const snapshot = await getDocs(q);
  const posts = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      content: data.content,
      media: data.media || [],
      createdAt: data.createdAt?.toDate().toISOString() ?? null,
      username: data.username,
      userFullName: data.userFullName || "",
      userPhotoURL: data.userPhotoURL,
    };
  }) as PostProps[];
  return posts;
}

export async function getPost(postId: string): Promise<PostProps | null> {
  const postDoc = await getDoc(doc(db, "posts", postId));
  if (!postDoc.exists()) return null;
  const data = postDoc.data();
  const post = {
    id: postDoc.id,
    userId: data.userId,
    content: data.content,
    media: data.media || [],
    createdAt: data.createdAt?.toDate().toISOString() ?? null,
    username: data.username,
    userFullName: data.userFullName || "",
    userPhotoURL: data.userPhotoURL,
    parentPostId: data.parentPostId || null,
  } as PostProps;
  
  return post;
}

export async function getComments(postId: string, limit = 10) {
  const q = query(
    collection(db, "posts"),
    where("parentPostId", "==", postId),
    orderBy("createdAt", "asc"),
    limitFn(limit)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
    id: doc.id,
    userId: data.userId,
    content: data.content,
    media: data.media || [],
    createdAt: data.createdAt?.toDate().toISOString() ?? null,
    username: data.username,
    userFullName: data.userFullName || "",
    userPhotoURL: data.userPhotoURL,
    }
  }) as PostProps[];
}

export async function getMoreComments(postId: string, limit = 10, lastDoc: number) {
  const q = query(
    collection(db, "posts"),
    where("parentPostId", "==", postId),
    orderBy("createdAt", "asc"),
    startAfter(lastDoc),
    limitFn(limit)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      content: data.content,
      media: data.media || [],
      createdAt: data.createdAt?.toDate().toISOString() ?? null,
      username: data.username,
      userFullName: data.userFullName || "",
      userPhotoURL: data.userPhotoURL,
      parentId: data.parentId,
    }
  }) as PostProps[];
}

export async function getMoreUserPosts(
  userId: string,
  lastDoc: number,
  limit = 10,
) {
  const q = query(
    collection(db, "posts"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    startAfter(lastDoc),
    limitFn(limit)
  );

  const snapshot = await getDocs(q);

  const posts = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      content: data.content,
      media: data.media || [],
      createdAt: data.createdAt?.toDate().toISOString() ?? null,
      username: data.username,
      userFullName: data.userFullName || "",
      userPhotoURL: data.userPhotoURL,
    };
  }) as PostProps[];

  return posts;
}

