import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  var __supabaseBrowserClient: SupabaseClient | undefined;
  var __supabaseAdminClient: SupabaseClient | undefined;
}

let browserClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-anon-key";

  return { url, anonKey };
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
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  globalThis.__supabaseAdminClient = adminClient;
  return adminClient;
}
