"use server";

import { firestoreAdmin } from "@/lib/firebaseAdmin";
import { UserProps } from "@/lib/types";

export async function getRandomUsers(currentUid: string) {
  const snapshot = await firestoreAdmin
  .collection("users")
  .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  const users: UserProps[] = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.uid !== currentUid) {
      users.push({
        uid: data.uid,
        username: data.username,
        photoURL: data.photoURL || null,
        fullName: data.fullName || null,
      });
    }
  });

  // Shuffle and return max 15
  const shuffled = users.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 15);
}
