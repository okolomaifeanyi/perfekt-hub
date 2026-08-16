"use server";

import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { runWithSupabaseClient } from "@/lib/supabase/request-context.mjs";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import type { SupabaseClient } from "@supabase/supabase-js";

async function withSupabaseRequestContext<T>(
  callback: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: cookieUpdates => {
      cookieUpdates.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    },
  });
  await supabase.auth.getUser();
  return runWithSupabaseClient(supabase, () => callback(supabase));
}

export async function getUserInterests(): Promise<string[]> {
  const { uid } = await getUserFromSession();
  if (!uid) return [];

  return withSupabaseRequestContext(async client => {
    const { data, error } = await client
      .from("user_interests")
      .select("interest_key")
      .eq("uid", uid);
    if (error) throw error;
    return (data ?? []).map(row => row.interest_key as string);
  });
}

// Single add/remove rather than a batch replace — the settings UI is a
// list of immediate-save toggles (same pattern as notification
// preferences), not a form with one Save button.
export async function addUserInterest(interestKey: string): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  return withSupabaseRequestContext(async client => {
    // Plain insert, not upsert — the table only grants insert/delete to
    // authenticated (see the migration), no update, and a toggle re-adding
    // an already-selected interest shouldn't happen from the UI anyway.
    const { error } = await client.from("user_interests").insert({ uid, interest_key: interestKey });
    if (error) throw error;
  });
}

export async function removeUserInterest(interestKey: string): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  return withSupabaseRequestContext(async client => {
    const { error } = await client
      .from("user_interests")
      .delete()
      .eq("uid", uid)
      .eq("interest_key", interestKey);
    if (error) throw error;
  });
}
