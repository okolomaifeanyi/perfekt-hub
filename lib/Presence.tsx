import {
  getDatabase,
  ref,
  onDisconnect,
  set,
  serverTimestamp,
} from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export function setupPresence() {
  const auth = getAuth();
  const db = getDatabase();

  onAuthStateChanged(auth, user => {
    if (!user) return;

    const userStatusRef = ref(db, `/status/${user.uid}`);

    // Online
    set(userStatusRef, {
      state: "online",
      lastChanged: serverTimestamp(),
    });

    // Auto set to offline when disconnected
    onDisconnect(userStatusRef).set({
      state: "offline",
      lastChanged: serverTimestamp(),
    });
  });
}
