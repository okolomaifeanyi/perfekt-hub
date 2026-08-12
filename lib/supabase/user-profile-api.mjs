import { fromSupabaseUserRow } from "./user-profile.mjs";

export async function syncUserProfile({
  uid,
  fetchImpl = globalThis.fetch,
} = {}) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const response = await fetchImpl("/api/user-profile", {
    method: "POST",
    headers,
    body: JSON.stringify(uid ? { uid } : {}),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Unable to sync user profile.";

    throw new Error(errorMessage);
  }

  return fromSupabaseUserRow(payload ?? {});
}
