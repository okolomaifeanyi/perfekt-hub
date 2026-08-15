import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase/client";

// Best-effort client identifier for rate limiting unauthenticated
// requests. Vercel sets x-forwarded-for reliably; a missing header (only
// plausible off Vercel, e.g. local dev) falls back to a single shared
// bucket rather than throwing.
async function getClientKey() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  return ip || "unknown";
}

// Returns true when the request is within limit, false when it should be
// rejected. Fails OPEN (allows the request through) if the check itself
// errors — a broken rate limiter must never take down the feature it's
// meant to be protecting.
export async function checkRateLimit(action, limit, windowSeconds) {
  try {
    const ip = await getClientKey();
    const client = getSupabaseAdminClient();
    const { data, error } = await client.rpc("check_rate_limit", {
      p_key: `${action}:${ip}`,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("checkRateLimit RPC failed:", error);
      return true;
    }
    return data === true;
  } catch (err) {
    console.error("checkRateLimit failed:", err);
    return true;
  }
}
