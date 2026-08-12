// app/dbActions.ts
"use server"; // Mark this file as server-side context

import { auth, db } from "@/lib/supabase"; // Import auth and db
import { FormState } from "@/lib/schemas/types";
import { UserProfileSchema } from "@/lib/schemas/userProfile";
import { doc, getDoc, setDoc, updateDoc } from "@/lib/supabase"; // Firestore functions
import { z } from "zod";



export type UserProfile = z.infer<typeof UserProfileSchema>;

// --- Server Action to create/update user profile ---
export async function createUserProfile(
  prevState: FormState, // For useActionState compatibility
  formData: FormData // FormData is passed by forms
): Promise<FormState> {
  "use client"; // This action runs on the client when called from a client component

  const user = auth.currentUser;
  if (!user) {
    return { message: "User not authenticated." };
  }

  // Extract username from form data (it's part of the signup form)
  const username = formData.get("username") as string;
  const email = formData.get("email") as string; // from signup form

  // Validate the username (you could use a separate schema or reuse parts)
  const parsed = z
    .object({ username: z.string().min(2, "Username is required").trim() })
    .safeParse({ username });

  if (!parsed.success) {
    return {
      errors: { username: parsed.error.flatten().fieldErrors.username },
      message: "Invalid username.",
    };
  }

  try {
    const userRef = doc(db, "users", user.uid); // Get a reference to the user's document
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Create profile if it doesn't exist (e.g., after initial signup)
      await setDoc(userRef, {
        uid: user.uid,
        username: parsed.data.username,
        email: email, // Store the email from signup
        createdAt: new Date().toISOString(),
        // Add other initial fields
      });
      console.log(`[DB Action] User profile created for ${user.uid}`);
      return { message: "User profile created successfully!" };
    } else {
      // Update profile if it already exists (e.g., from a profile settings page)
      // This part would typically be in a separate `updateUserProfile` action for clarity
      // For this action, we assume it's primarily for initial creation or specific updates
      await updateDoc(userRef, {
        username: parsed.data.username,
        updatedAt: new Date().toISOString(),
      });
      console.log(`[DB Action] User profile updated for ${user.uid}`);
      return { message: "User profile updated successfully!" };
    }
  } catch (error: unknown) {
    console.error("[DB Action] Error creating/updating user profile:", error);
    return { message: error instanceof Error ? error.message : "Failed to update profile." };
  }
}

// --- Server Action to get user profile ---
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  "use client"; // This runs on the client to use the Supabase client

  if (!uid) {
    return null;
  }

  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      // Validate with schema before returning
      const parsed = UserProfileSchema.safeParse(data);
      if (parsed.success) {
        return parsed.data;
      } else {
        console.error("Failed to parse user profile from DB:", parsed.error);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error("[DB Action] Error fetching user profile:", error);
    return null;
  }
}

// --- Server Action to update user profile (more general purpose) ---
export async function updateUserProfile(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  "use client";

  const user = auth.currentUser;
  if (!user) {
    return { message: "User not authenticated." };
  }

  const data = {
    username: formData.get("username"),
    bio: formData.get("bio"), // Assuming you add a bio field
    email: user.email, // Ensure email comes from auth, not form input for security
  };

  const parsed = UserProfileSchema.partial().safeParse(data); // Use partial for updates

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      errors: {
        username: errors.username,
        email: errors.email, // Will likely not be present if email comes from auth
        // Add other fields you're updating
      },
      message: "Invalid input for profile update.",
    };
  }

  try {
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, parsed.data); // Update with validated data
    return { message: "Profile updated successfully!" };
  } catch (error: unknown) {
    console.error("[DB Action] Error updating user profile:", error);
    return { message: error instanceof Error ? error.message : "Failed to update profile." };
  }
}
