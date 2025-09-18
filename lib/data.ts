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
import { PostProps, UserProps } from "./types";

// Get a single user
export async function getUser(userId: string): Promise<UserProps | null> {
  const userDoc = await getDoc(doc(db, "users", userId));

  if (!userDoc.exists()) return null

  return {
    uid: userDoc.id,
    username: userDoc.data().username,
    photoURL: userDoc.data().photoURL,
    fullName: userDoc.data().fullName,
    
  };
}

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
      linkPreview: data.linkPreview || null,
    };
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
      linkPreview: data.linkPreview || null,
    };
  }) as PostProps[];
  return posts;
}

// Get posts by user
export async function getInitialUserPosts(userId: string, limit = 10) {
  const q = query(
    collection(db, "posts"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
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
      linkPreview: data.linkPreview || null,
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
    quotePostId: data.quotePostId || null,
    linkPreview: data.linkPreview || null,
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
      linkPreview: data.linkPreview || null,
    };
  }) as PostProps[];
}

export async function getMoreComments(
  postId: string,
  limit = 10,
  lastDoc: number
) {
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
      parentPostId: data.parentPostId || "",
      linkPreview: data.linkPreview || null,
    };
  }) as PostProps[];
}

export async function getMoreUserPosts(
  userId: string,
  lastDoc: number,
  limit = 10
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
      linkPreview: data.linkPreview || null,
    };
  }) as PostProps[];

  return posts;
}

export async function getReplyCount(postId: string) {
  const q = query(collection(db, "posts"), where("parentPostId", "==", postId));
  const snapshot = await getDocs(q);
  return snapshot.size;
}

export async function getQuoteCount(postId: string) {
  const q = query(collection(db, "posts"), where("quotePostId", "==", postId));
  const snapshot = await getDocs(q);
  return snapshot.size;
}
