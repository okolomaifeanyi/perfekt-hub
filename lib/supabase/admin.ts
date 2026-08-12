import { createLazyProxy } from "./lazy.mjs";
import { getAuth } from "../shims/supabase-admin/auth";
import { getFirestore } from "../shims/supabase-admin/firestore";
import { getSupabaseAdminClient } from "./client";

export const authAdmin = createLazyProxy(() => getAuth());
export const firestoreAdmin = getFirestore();
export const dbAdmin = getFirestore();
export { getSupabaseAdminClient };
