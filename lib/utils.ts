import { clsx, type ClassValue } from "clsx";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "@/lib/supabase";
import { twMerge } from "tailwind-merge";
import { db } from "@/lib/supabase";
import { PixelCrop, UserProps, ViewerRole } from "./types";
import { uploadToCloudinary } from "@/components/post-composer/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildReactionRequestInit } from "@/lib/reaction-request.mjs";
import { mapSupabaseAuthError as mapSupabaseAuthErrorShared } from "@/lib/auth-errors.mjs";
// import { usePostCounts } from "@/lib/store/postCounts";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface EmojiData {
  // Define the structure of the emoji data here
  [key: string]: string | number | boolean | null | undefined; // Replace with specific types as needed
}

let emojiDataPromise: Promise<EmojiData> | null = null;

export function loadEmojiData() {
  if (!emojiDataPromise) {
    emojiDataPromise = fetch(
      "https://cdn.jsdelivr.net/npm/@emoji-mart/data"
    ).then(res => res.json());
  }
  return emojiDataPromise;
}

export function mapSupabaseAuthError(error: {
  code?: string;
  message?: string;
}): string {
  return mapSupabaseAuthErrorShared(error);
}

export async function toggleReaction({
  postId,
  type,
}: {
  postId: string;
  type: "like" | "dislike";
}) {
  const accessToken = await getSupabaseToken();
  const res = await fetch(
    "/api/reactions/toggle",
    buildReactionRequestInit({
      postId,
      type,
      accessToken,
    })
  );

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(
      typeof payload?.error === "string" && payload.error.trim()
        ? payload.error
        : "Failed to toggle reaction"
    );
  }

  const updatedCounts = await res.json();

  // ⚠️ Keep optimistic UI state — don’t overwrite userReaction here.
  return updatedCounts;
}

export async function getSupabaseToken(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return token;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toSafeISOString = (val: any): string => {
  try {
    if (val instanceof Date) return val.toISOString();
    if (val?.toDate instanceof Function) return val.toDate().toISOString();
  } catch (err) {
    console.error("Failed to convert to ISO string:", err);
  }
  return new Date(0).toISOString();
};

export async function getUserByUsername(username: string) {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return null;

    // Assuming usernames are unique → take the first
    const doc = querySnapshot.docs[0];

    return { ...(doc.data() as UserProps) };
  } catch (error) {
    console.error("Error fetching user by username:", error);
    return null;
  }
}

export const handleAvatarUpload = async (
  e: React.ChangeEvent<HTMLInputElement>,
  user: UserProps
) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const url = await uploadToCloudinary(file);
  if (url && user?.uid) {
    await updateDoc(doc(db, "users", user.uid), { photoURL: url });
  }
};

export const handleCoverUpload = async (
  e: React.ChangeEvent<HTMLInputElement>,
  user: UserProps
) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const url = await uploadToCloudinary(file);
  if (url && user?.uid) {
    await updateDoc(doc(db, "users", user.uid), { coverURL: url });
  }
};

export default function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop
): Promise<{ file: File; url: string }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) return reject("Canvas not supported");

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      canvas.toBlob(blob => {
        if (!blob) return reject("Canvas is empty");
        const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
        resolve({ file, url: URL.createObjectURL(blob) });
      }, "image/jpeg");
    };
    image.onerror = e => reject(e);
  });
}

export const dataImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAyklEQVR4AYTKq4oCYRjG8b/CzsrCwu6mSbsraPCAJqNJTCLYvACryaDVGzFZTHaLoKBBvQMRDSIexgM4g87pGw/liz7wwsvz/Pzei/i5x3Q9mvMrtfGJSndLY3TEcrz7Ak/QXpoMbB/1xAfVuI/O7ExrtJdgsrFwDAtN09ANA+EKhlNdAs+wuexM+geF3uYN5yIQtitBRlUoBwXFyBeFcIBS1Caf/JYgF/nEsQSLlcb6oBNQ3smnfiR4fOmYSuhXJRb+I5v6f1TPuwEAAP//IuVqRgAAAAZJREFUAwBLeGnx3hCf3gAAAABJRU5ErkJggg==";

export function canView(
  field: keyof UserProps,
  viewerRole: ViewerRole
): boolean {
  const rules: Record<keyof UserProps, ViewerRole> = {
    phoneNumber: "friend",
    email: "friend",
    dob: "friend",
    relationship: "friend",
    website: "public",
    work: "public",
    company: "friend",
    gender: "public",
    location: "friend",
    education: "public",
    linkedin: "public",
    github: "public",
    twitter: "public",
    instagram: "public",
    username: "public",
    fullName: "public",
    bio: "public",
    createdAt: "public",
    uid: "self",
    photoURL: "public",
    coverURL: "public",
    followersCount: "public",
    followingCount: "public",
    friendsCount: "public",
    postsCount: "public",
    online: "friend",
    lastSeen: "friend",
    completedProfile: "self",
    country: "public",
    fullName_lowercase: "self",
  };

  const requiredRole = rules[field] || "public";
  if (requiredRole === "public") return true;

  if (
    requiredRole === "friend" &&
    (viewerRole === "friend" || viewerRole === "self")
  )
    return true;
  if (requiredRole === "self" && viewerRole === "self") return true;
  return false;
}

export async function isFriend(currentUid: string, profileUid: string) {
  const snap = await getDoc(
    doc(db, "users", currentUid, "friends", profileUid)
  );
  return snap.exists();
}
