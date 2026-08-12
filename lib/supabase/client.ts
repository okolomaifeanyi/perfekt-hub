import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  var __supabaseBrowserClient: SupabaseClient | undefined;
  var __supabaseAdminClient: SupabaseClient | undefined;
}

let browserClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // The local-dev CLI defaults exist so `next dev` works without extra
  // setup. Falling back to them in production is worse than crashing: it
  // silently points every Supabase call (auth, data, everything) at an
  // unreachable localhost instance instead of surfacing a clear error —
  // that's exactly what shipped a production build with Google sign-in
  // redirecting to http://127.0.0.1:54321.
  if ((!url || !anonKey) && process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be set at build time in production — refusing to fall back to the local dev Supabase instance."
    );
  }

  return {
    url: url || "http://127.0.0.1:54321",
    anonKey: anonKey || "placeholder-anon-key",
  };
}

export function getSupabasePublicClient() {
  const { url, anonKey } = getSupabaseEnv();

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  if (globalThis.__supabaseBrowserClient) {
    browserClient = globalThis.__supabaseBrowserClient;
    return browserClient;
  }

  const { url, anonKey } = getSupabaseEnv();
  browserClient = createBrowserClient(url, anonKey);
  globalThis.__supabaseBrowserClient = browserClient;
  return browserClient;
}

export function getSupabaseServerClient(cookieStore?: {
  getAll?: () => Array<{ name: string; value: string }>;
  setAll?: (cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => void;
  get?: (name: string) => { value: string } | undefined;
  set?: (name: string, value: string, options?: Record<string, unknown>) => void;
  remove?: (name: string, options?: Record<string, unknown>) => void;
}) {
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore?.getAll?.() ?? [];
      },
      setAll(cookies) {
        cookieStore?.setAll?.(cookies);
      },
    },
  });
}

export function getSupabaseAdminClient() {
  if (adminClient) return adminClient;
  if (globalThis.__supabaseAdminClient) {
    adminClient = globalThis.__supabaseAdminClient;
    return adminClient;
  }

  const { url, anonKey } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // This client is the default fallback for every server-side Firestore-shim
  // read that isn't explicitly wrapped in an authenticated request context
  // (see getClient() in lib/shims/firestore-core.ts), so it needs to bypass
  // RLS via service_role. Falling back to the anon key here doesn't fail
  // loudly — the client still gets created and looks fine — it just quietly
  // demotes every one of those reads to the anon role, which now correctly
  // has no grant on tables like users and surfaces as a confusing "permission
  // denied for table users" error deep inside a PostgREST call instead of a
  // clear error at the point the misconfiguration actually is.
  if (!serviceRoleKey && process.env.NODE_ENV === "production") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY must be set in production — refusing to fall back to the anon key for the admin client."
    );
  }

  adminClient = createClient(url, serviceRoleKey || anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  globalThis.__supabaseAdminClient = adminClient;
  return adminClient;
}
