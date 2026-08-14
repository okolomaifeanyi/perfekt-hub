import { db } from "@/lib/supabase";
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
} from "@/lib/supabase";
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
    createdAt: userDoc.data().createdAt?.toDate() ?? null,
    bio: userDoc.data().bio || "",
    website: userDoc.data().website || "",
    followersCount: userDoc.data().followersCount || 0,
    followingCount: userDoc.data().followingCount || 0,
    friendsCount: userDoc.data().friendsCount || 0,
    relationship: userDoc.data().relationship || "",
    country: userDoc.data().country || "",
    location: userDoc.data().location || "",
    education: userDoc.data().education || "",
    company: userDoc.data().company || "",
    linkedin: userDoc.data().linkedin || "",
    github: userDoc.data().github || "",
    twitter: userDoc.data().twitter || "",
    work: userDoc.data().work || "",
    phoneNumber: userDoc.data().phoneNumber || "",
    instagram: userDoc.data().instagram || "",
    postsCount: userDoc.data().postsCount || 0,
    online: userDoc.data().online || false,
    lastSeen: userDoc.data().lastSeen?.toDate?.() ?? null,
  } as UserProps
};

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
    // These were missing entirely — this is the function behind the post
    // detail page (/{username}/{postId}), so without postType a poll or
    // product post rendered as a plain text post with no poll/product card
    // at all, and reply/quote/view counts and the group tag silently
    // showed as zero/absent on that page specifically (other fetch paths
    // like the feed carried these fine; this one just never did).
    replyCount: data.replyCount ?? 0,
    quoteCount: data.quoteCount ?? 0,
    viewCount: data.viewCount ?? 0,
    engagementScore: data.engagementScore ?? 0,
    groupId: data.groupId ?? null,
    groupName: data.groupName ?? null,
    visibility: data.visibility ?? "public",
    isPinned: data.isPinned ?? false,
    postType: data.postType ?? "text",
    moderationStatus: data.moderationStatus ?? "pending",
    aiImageAltText: data.aiImageAltText ?? null,
    textToxic: data.textToxic ?? false,
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