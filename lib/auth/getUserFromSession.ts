import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/client";

export async function getUserFromSession() {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    // Refresh tokens are rotated: discarding the refreshed session here would
    // consume the stored token without persisting its replacement, so any
    // later client in the same request fails to refresh and falls back to the
    // `anon` role.
    setAll: cookieUpdates => {
      cookieUpdates.forEach(({ name, value, options }) => {
        try {
          cookieStore.set(name, value, options);
        } catch {
          // Server Components cannot mutate cookies; the proxy refreshes them.
        }
      });
    },
  });

  // getClaims() verifies the JWT locally against this project's cached
  // asymmetric signing key instead of getUser()'s mandatory network round
  // trip — this function is called from nearly every server action, so that
  // round trip was a fixed tax on every one of them. Safe here specifically
  // because this function only returns the uid, never the client itself, so
  // there's no later query on this same client instance that needs the
  // fuller session hydration getUser() would have performed as a side effect.
  const { data } = await supabase.auth.getClaims();
  return { uid: (data?.claims.sub as string | undefined) ?? null };
}
