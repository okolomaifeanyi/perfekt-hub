import { createServerClient } from "@supabase/ssr";

export function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader) return null;

  const trimmed = authorizationHeader.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  return token || null;
}

function getSupabaseEnv(env = {}) {
  const url =
    env.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const anonKey =
    env.anonKey ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "placeholder-anon-key";

  return { url, anonKey };
}

export function createRequestSupabaseClient({
  authorizationHeader,
  cookieStore,
  env,
  createServerClientImpl = createServerClient,
} = {}) {
  const bearerToken = extractBearerToken(authorizationHeader);
  const { url, anonKey } = getSupabaseEnv(env);

  const supabase = createServerClientImpl(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore?.getAll?.() ?? [];
      },
      setAll(cookies) {
        cookieStore?.setAll?.(cookies);
      },
    },
    // Validating a bearer token via `auth.getUser(token)` does not attach it to
    // the client, so PostgREST queries would still run as `anon`. Setting it as
    // a global header makes RLS see the real user when the caller authenticates
    // with a bearer token instead of cookies.
    ...(bearerToken
      ? { global: { headers: { Authorization: `Bearer ${bearerToken}` } } }
      : {}),
  });

  return { supabase, bearerToken };
}
