import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";

export async function mirrorPresence(uid: string, state: "online" | "offline") {
  const db = getFirestore();
  await updateDoc(doc(db, "users", uid), {
    online: state === "online",
    lastSeen: serverTimestamp(),
  });
}
