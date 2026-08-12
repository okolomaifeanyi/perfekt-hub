import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { lookupEmailByUsername } from "@/lib/supabase/user-profile-rpc.mjs";
import { syncUserProfile } from "@/lib/supabase/user-profile-api.mjs";
import { useUserStore } from "@/lib/store/useUserStore";
import type { UserProps } from "@/lib/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  buildSavedAccountFromSession,
  rememberSavedAccount,
} from "@/lib/saved-accounts.mjs";

type AuthUser = SupabaseUser;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function buildFallbackProfile(user: AuthUser): UserProps {
  const displayName =
    user.user_metadata?.fullName ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "user";
  const providedUsername =
    typeof user.user_metadata?.username === "string"
      ? user.user_metadata.username.trim()
      : "";

  return {
    uid: user.id,
    email: user.email ?? "",
    username: providedUsername || slugify(displayName || "user") || "user",
    fullName:
      user.user_metadata?.fullName ??
      user.user_metadata?.name ??
      displayName,
    photoURL:
      user.user_metadata?.avatar_url ??
      user.user_metadata?.picture ??
      user.user_metadata?.photoURL ??
      "",
    completedProfile: undefined,
    createdAt: user.created_at ? new Date(user.created_at) : new Date(),
    lastSeen: null,
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    friendsCount: 0,
    fullName_lowercase: String(
      user.user_metadata?.fullName ??
        user.user_metadata?.name ??
        displayName
    )
      .trim()
      .toLowerCase(),
  };
}

export async function saveOrUpdateUser(
  user: AuthUser
): Promise<UserProps> {
  const fallbackProfile = buildFallbackProfile(user);

  try {
    return await syncUserProfile({
      uid: user.id,
    });
  } catch {
    return fallbackProfile;
  }
}

export async function loginClient(identifier: string, password: string) {
  try {
    const supabase = getSupabaseBrowserClient();
    let email = identifier.trim().toLowerCase();

    if (!email.includes("@")) {
      const resolvedEmail = await lookupEmailByUsername(supabase, email);
      if (!resolvedEmail) {
        return { error: "No user found with this username." };
      }

      email = resolvedEmail.toLowerCase();
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const message =
        error.message.includes("Invalid login credentials")
          ? "Incorrect email/username or password."
          : error.message;
      return { error: message };
    }

    if (data.user) {
      const profile = await saveOrUpdateUser(data.user);
      if (data.session) {
        rememberSavedAccount(window.localStorage, {
          ...buildSavedAccountFromSession({
            user: data.user,
            session: data.session,
            profile,
          }),
          lastUsedAt: new Date().toISOString(),
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return {
      error: error instanceof Error ? error.message : "An unknown error occurred.",
    };
  }
}

export async function logoutClient(router: AppRouterInstance) {
  const { clearUser } = useUserStore.getState();
  const supabase = getSupabaseBrowserClient();

  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("Supabase signOut failed:", err);
  }

  clearUser();
  router.push("/login");
}
