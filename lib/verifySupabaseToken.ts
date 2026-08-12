import { getSupabaseAdminClient } from "@/lib/supabase/client";

export async function verifySupabaseToken(token: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return false;
    return Boolean(data.user?.id);
  } catch (err) {
    console.error("Token verification failed:", err);
    return false;
  }
}
