"use server";

import { firestoreAdmin } from "@/lib/firebaseAdmin";
import { UserProps } from "@/lib/types";

export async function getRandomUsers(currentUid: string) {
  // 1. Collect all related UIDs (following, friends, sent/received requests)
  const exclusionSet = new Set<string>();
  exclusionSet.add(currentUid); // Exclude self

  const collectionsToCheck = [
    `users/${currentUid}/following`,
    `users/${currentUid}/friends`,
    `users/${currentUid}/friendRequestsSent`,
    `users/${currentUid}/friendRequestsReceived`,
  ];

  await Promise.all(
    collectionsToCheck.map(async (path) => {
      const snap = await firestoreAdmin.collection(path).get();
      snap.forEach(doc => exclusionSet.add(doc.id));
    })
  );

  // 2. Fetch recent users
  const snapshot = await firestoreAdmin
    .collection("users")
    .orderBy("createdAt", "desc")
    .limit(50) // increase pool for better filtering
    .get();

  // 3. Filter, shuffle, and return
  const users: UserProps[] = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    if (!exclusionSet.has(data.uid)) {
      users.push({
        uid: data.uid,
        username: data.username,
        photoURL: data.photoURL || null,
        fullName: data.fullName || null,
      });
    }
  });

  const shuffled = users.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 15);
}
