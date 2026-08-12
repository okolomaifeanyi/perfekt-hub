import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { fromSupabaseUserRow, toSupabaseUserRow } from "@/lib/supabase/user-profile.mjs";
import type { UserProps } from "@/lib/types";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-anon-key";

  return { url, anonKey };
}

async function createRequestClient(request: NextRequest) {
  const authorizationHeader = request.headers.get("authorization");
  const bearerToken = authorizationHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (bearerToken) {
    const { url, anonKey } = getSupabaseEnv();
    const supabase = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      },
    });

    return { supabase, bearerToken };
  }

  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: cookieUpdates => {
      cookieUpdates.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    },
  });

  return { supabase };
}

function getAuthMetadata(user: {
  email?: string | null;
  created_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
}) {
  const displayName =
    (typeof user.user_metadata?.fullName === "string" &&
      user.user_metadata.fullName.trim()) ||
    (typeof user.user_metadata?.name === "string" &&
      user.user_metadata.name.trim()) ||
    user.email?.split("@")[0] ||
    "user";

  const photoURL =
    (typeof user.user_metadata?.avatar_url === "string" &&
      user.user_metadata.avatar_url.trim()) ||
    (typeof user.user_metadata?.picture === "string" &&
      user.user_metadata.picture.trim()) ||
    (typeof user.user_metadata?.photoURL === "string" &&
      user.user_metadata.photoURL.trim()) ||
    "";

  const provider =
    typeof user.app_metadata?.provider === "string" && user.app_metadata.provider
      ? user.app_metadata.provider
      : "supabase";

  return { displayName, photoURL, provider };
}

function buildProfileShape(user: {
  id: string;
  email?: string | null;
  created_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
}) {
  const { displayName, photoURL, provider } = getAuthMetadata(user);
  const username =
    typeof user.user_metadata?.username === "string" &&
    user.user_metadata.username.trim()
      ? user.user_metadata.username.trim()
      : displayName;

  return {
    uid: user.id,
    email: user.email ?? "",
    username,
    fullName: displayName,
    photoURL,
    completedProfile: false,
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    friendsCount: 0,
    providerId: provider,
    createdAt: user.created_at ? new Date(user.created_at) : new Date(),
    lastLoginAt: new Date(),
    fullName_lowercase: displayName.trim().toLowerCase(),
    randomKey: Math.random(),
  };
}

function markCompletedProfile(profile: UserProps | Record<string, unknown> | null) {
  if (!profile) return { completedProfile: false };

  const profileData = profile as Record<string, unknown>;
  const phoneNumber =
    profileData.phonenumber ?? profileData.phoneNumber ?? profileData.phone_number;
  const gender = profileData.gender;
  const dob = profileData.dob;
  const photoURL = profileData.photourl ?? profileData.photoURL;

  return {
    completedProfile:
      Boolean(profileData.completedprofile ?? profileData.completedProfile) ||
      Boolean(phoneNumber && gender && dob && photoURL),
  };
}

async function getAuthenticatedUser(request: NextRequest) {
  const { supabase, bearerToken } = await createRequestClient(request);
  const { data, error } = bearerToken
    ? await supabase.auth.getUser(bearerToken)
    : await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return { supabase, user: data.user };
}

export async function GET(request: NextRequest) {
  try {
    const authenticated = await getAuthenticatedUser(request);

    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { supabase, user } = authenticated;
    const profileShape = buildProfileShape(user);
    const { data: profile, error } = await supabase
      .from("users")
      .select("*")
      .eq("uid", user.id)
      .maybeSingle();
    if (error) throw error;

    const resolvedProfile =
      profile ? fromSupabaseUserRow(profile) : fromSupabaseUserRow(toSupabaseUserRow(profileShape));

    return NextResponse.json({
      ...resolvedProfile,
      ...markCompletedProfile(resolvedProfile),
    });
  } catch (error) {
    console.error("Error in /api/user-profile", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const authenticated = await getAuthenticatedUser(request);

    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { supabase, user } = authenticated;
    const profileShape = buildProfileShape(user);

    if (body?.uid && body.uid !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: existingProfile, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("uid", user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingProfile) {
      const updates: Record<string, unknown> = {
        lastloginat: new Date(),
      };

      if (user.email && user.email !== existingProfile.email) {
        updates.email = user.email;
      }

      if (!existingProfile.username) {
        updates.username = profileShape.username;
      }

      if (!existingProfile.fullname) {
        updates.fullname = profileShape.fullName;
      }

      if (!existingProfile.photourl) {
        updates.photourl = profileShape.photoURL;
      }

      if (!existingProfile.fullname_lowercase) {
        updates.fullname_lowercase = profileShape.fullName_lowercase;
      }

      if (!existingProfile.providerid) {
        updates.providerid = profileShape.providerId;
      }

      const { data: updatedProfile, error: updateError } = await supabase
        .from("users")
        .update(updates)
        .eq("uid", user.id)
        .select("*")
        .maybeSingle();

      if (updateError) throw updateError;

      const resolvedProfile = updatedProfile ?? existingProfile;

      return NextResponse.json({
        ...(resolvedProfile ? fromSupabaseUserRow(resolvedProfile) : {}),
        ...markCompletedProfile(resolvedProfile),
      });
    }

    const profileRow = toSupabaseUserRow(profileShape);

    const { data: insertedProfile, error: insertError } = await supabase
      .from("users")
      .upsert(profileRow, { onConflict: "uid" })
      .select("*")
      .maybeSingle();

    if (insertError) throw insertError;

    return NextResponse.json({
      ...(insertedProfile ? fromSupabaseUserRow(insertedProfile) : fromSupabaseUserRow(profileRow)),
      ...markCompletedProfile(insertedProfile ?? profileRow),
    });
  } catch (error) {
    console.error("Error in /api/user-profile", error);
    return NextResponse.json(
      { error: "Unable to sync user profile" },
      { status: 500 }
    );
  }
}
