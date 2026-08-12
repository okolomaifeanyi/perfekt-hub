import { fromSupabaseUserRow, toSupabaseUserRow } from "./user-profile.mjs";

function normalizeUsername(username) {
  return String(username ?? "")
    .trim()
    .toLowerCase();
}

function normalizeSupabaseError(error) {
  if (!error) return null;
  if (typeof error === "string") return new Error(error);
  if (error instanceof Error) return error;

  const message =
    typeof error.message === "string" && error.message.trim()
      ? error.message
      : "An unknown Supabase error occurred.";
  const normalizedError = new Error(message);
  if (typeof error.code === "string") {
    normalizedError.code = error.code;
  }
  return normalizedError;
}

export async function generateUniqueUsername(supabase, baseName) {
  const normalizedBaseName = normalizeUsername(baseName) || "user";

  const { data, error } = await supabase.rpc("generate_unique_username", {
    base_name: normalizedBaseName,
  });

  const normalizedError = normalizeSupabaseError(error);
  if (normalizedError) throw normalizedError;

  return typeof data === "string" && data.trim() ? data.trim() : normalizedBaseName;
}

export async function lookupEmailByUsername(supabase, username) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) {
    return null;
  }

  const { data, error } = await supabase.rpc("lookup_user_email_by_username", {
    input_username: normalizedUsername,
  });

  const normalizedError = normalizeSupabaseError(error);
  if (normalizedError) throw normalizedError;

  const email = typeof data === "string" ? data.trim() : "";
  return email || null;
}

export async function getUserProfileByUid(supabase, uid) {
  const normalizedUid = normalizeUsername(uid);
  if (!normalizedUid) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_user_profile_by_uid", {
    target_uid: normalizedUid,
  });

  const normalizedError = normalizeSupabaseError(error);
  if (normalizedError) throw normalizedError;

  return data ? fromSupabaseUserRow(data) : null;
}

export async function syncUserProfileViaRpc(supabase, profile) {
  const { data, error } = await supabase.rpc("sync_user_profile", {
    profile: toSupabaseUserRow(profile),
  });

  const normalizedError = normalizeSupabaseError(error);
  if (normalizedError) throw normalizedError;

  return fromSupabaseUserRow(data ?? toSupabaseUserRow(profile));
}
