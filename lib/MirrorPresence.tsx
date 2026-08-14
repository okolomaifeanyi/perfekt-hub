import { doc, updateDoc, serverTimestamp } from "@/lib/supabase";
import { getFirestore } from "@/lib/supabase";

// Called only by the heartbeat (hooks/usePresenceHeartbeat.ts) on an
// interval while a tab is open and visible — never at sign-out. Presence
// status (lib/presence.mjs) is derived purely from how fresh lastSeen is,
// so writing here on logout would refresh lastSeen and make the user look
// freshly online right as they leave; there's no "offline" write, by design.
export async function mirrorPresence(uid: string) {
  const db = getFirestore();
  await updateDoc(doc(db, "users", uid), {
    online: true,
    lastSeen: serverTimestamp(),
  });
}
