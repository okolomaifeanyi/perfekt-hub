type SupabaseClientGetter = () => unknown | null;

declare global {
  var __supabaseGetCurrentClient: SupabaseClientGetter | undefined;
}

export function getCurrentSupabaseClient() {
  return globalThis.__supabaseGetCurrentClient?.() ?? null;
}
