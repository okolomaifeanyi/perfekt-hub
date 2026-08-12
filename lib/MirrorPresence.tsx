import { doc, updateDoc, serverTimestamp } from "@/lib/supabase";
import { getFirestore } from "@/lib/supabase";

export async function mirrorPresence(uid: string, state: "online" | "offline") {
  const db = getFirestore();
  await updateDoc(doc(db, "users", uid), {
    online: state === "online",
    lastSeen: serverTimestamp(),
  });
}
