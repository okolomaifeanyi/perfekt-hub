import type { SupabaseClient } from "@supabase/supabase-js";

export type RequestCookie = { name: string; value: string };
export type RequestCookieUpdate = RequestCookie & {
  options?: Record<string, unknown>;
};

export interface RequestSupabaseClientOptions {
  authorizationHeader?: string | null;
  cookieStore?: {
    getAll?: () => RequestCookie[];
    setAll?: (cookies: RequestCookieUpdate[]) => void;
  };
  env?: {
    url?: string;
    anonKey?: string;
  };
  createServerClientImpl?: (...args: unknown[]) => SupabaseClient;
}

export interface RequestSupabaseClientResult {
  supabase: SupabaseClient;
  bearerToken: string | null;
}

export function extractBearerToken(
  authorizationHeader?: string | null
): string | null;

export function createRequestSupabaseClient(
  options?: RequestSupabaseClientOptions
): RequestSupabaseClientResult;
