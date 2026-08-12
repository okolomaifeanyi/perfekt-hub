import { getSupabaseAdminClient } from "@/lib/supabase/client";
import { serverTimestamp } from "./firestore";

type DatabaseRef = {
  path: string;
  uid: string | null;
};

function resolveUid(path: string) {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

export function getDatabase() {
  return {};
}

export function ref(_db: unknown, path: string): DatabaseRef {
  return { path, uid: resolveUid(path) };
}

export async function set(reference: DatabaseRef, value: Record<string, unknown>) {
  const uid = reference.uid;
  if (!uid) return;

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("users")
    .update({
      online: value.state === "online",
      lastSeen: value.lastChanged ?? new Date(),
    })
    .eq("uid", uid);

  if (error) throw error;
}

export async function update(reference: DatabaseRef, value: Record<string, unknown>) {
  return set(reference, value);
}

export function onDisconnect(reference: DatabaseRef) {
  return {
    async set(value: Record<string, unknown>) {
      return set(reference, value);
    },
  };
}

export { serverTimestamp };

