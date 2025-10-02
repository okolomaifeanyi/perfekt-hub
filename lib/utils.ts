import { clsx, type ClassValue } from "clsx";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { twMerge } from "tailwind-merge";
import { db } from "./firebase";
import { PixelCrop, UserProps, ViewerRole } from "./types";
import { uploadToCloudinary } from "@/components/post-composer/utils";
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

// lib/utils/authErrors.ts

// Define a type for Firebase Auth errors, as 'error.code' is common.
interface FirebaseAuthError extends Error {
  code?: string;
}

/**
 * Maps Firebase authentication error codes to user-friendly messages.
 * @param error The Firebase error object.
 * @returns A user-friendly error message.
 */
export function mapFirebaseAuthError(error: FirebaseAuthError): string {
  if (!error || !error.code) {
    return "An unexpected error occurred. Please try again.";
  }

  switch (error.code) {
    case "auth/email-already-in-use":
      return "This email address is already registered. Please use a different one or log in.";
    case "auth/invalid-email":
      return "The email address is not valid. Please check the format.";
    case "auth/operation-not-allowed":
      return "Email/password login is not enabled for this project. Please contact support.";
    case "auth/weak-password":
      return "The password is too weak. Please choose a stronger password (at least 6 characters, with letters, numbers, and symbols).";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/user-not-found":
      return "No account found with this email. Please check your spelling or sign up.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/too-many-requests":
      return "Too many failed login attempts. Please try again later.";
    case "auth/network-request-failed":
      return "A network error occurred. Please check your internet connection and try again.";
    case "auth/popup-closed-by-user":
      return "Authentication process cancelled. Please try again.";
    case "auth/cancelled-popup-request":
      return "Login cancelled. Please try again.";
    case "auth/requires-recent-login":
      return "This operation requires re-authentication. Please log in again.";
    case "auth/invalid-credential":
      return "Invalid login credentials. Please check your email and password.";
    case "auth/credential-already-in-use":
      return "This credential (e.g., Google account) is already linked to another user.";
    case "auth/account-exists-with-different-credential":
      return "An account with this email already exists but with a different login method. Please try logging in with the original method.";
    // Add more cases as you encounter them or need specific messages
    default:
      console.error(
        "Unhandled Firebase Auth Error:",
        error.code,
        error.message
      );
      return "An unknown error occurred. Please try again later.";
  }
}

export async function toggleReaction({
  postId,
  userId,
  type,
}: {
  postId: string;
  userId: string;
  type: "like" | "dislike";
}) {
  const res = await fetch("/api/reactions/toggle", {
    method: "POST",
    body: JSON.stringify({ postId, userId, type }),
  });

  if (!res.ok) {
    throw new Error("Failed to toggle reaction");
  }

  const updatedCounts = await res.json();

  // ⚠️ Keep optimistic UI state — don’t overwrite userReaction here.
  return updatedCounts;
}

export async function getFirebaseToken(): Promise<string> {
  const user = await import("firebase/auth").then(
    ({ getAuth }) => getAuth().currentUser
  );
  if (!user) throw new Error("Not authenticated");
  return await user.getIdToken();
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

export function canView(field: keyof UserProps, viewerRole: ViewerRole): boolean {
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