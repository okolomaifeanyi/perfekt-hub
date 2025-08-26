import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { usePostCounts } from "@/lib/store/postCounts";

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
      console.error("Unhandled Firebase Auth Error:", error.code, error.message);
      return "An unknown error occurred. Please try again later.";
  }
}

export async function toggleReaction({
  postId,
  userId,
  type, // "like" | "dislike"
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

  // 🔥 Update zustand
  const { setCounts } = usePostCounts.getState();
  setCounts(postId, {
    likeCount: updatedCounts.likeCount,
    dislikeCount: updatedCounts.dislikeCount,
  });

  return updatedCounts;
}

export async function getFirebaseToken(): Promise<string> {
  const user = await import("firebase/auth").then(
    ({ getAuth }) => getAuth().currentUser
  );
  if (!user) throw new Error("Not authenticated");
  return await user.getIdToken();
}