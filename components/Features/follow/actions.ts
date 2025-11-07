// app/actions/getSmartSuggestions.ts
"use server";

import { firestoreAdmin } from "@/lib/firebaseAdmin";
import { UserProps } from "@/lib/types";

function fuzzyMatch(a: string, b: string): number {
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.8;
  return 0;
}

function calculateAge(dob: string): number | null {
  const [year] = dob.split("-");
  const birthYear = parseInt(year, 10);
  if (isNaN(birthYear)) return null;
  return new Date().getFullYear() - birthYear;
}

export async function getSmartSuggestions(
  currentUid: string
): Promise<UserProps[]> {
  const exclude = new Set<string>([currentUid]);

  // 1. Exclude known users
  const excludePaths = [
    `users/${currentUid}/following`,
    `users/${currentUid}/friends`,
    `users/${currentUid}/friendRequestsSent`,
    `users/${currentUid}/friendRequestsReceived`,
  ];

  await Promise.all(
    excludePaths.map(async path => {
      const snap = await firestoreAdmin.collection(path).get();
      snap.forEach(d => exclude.add(d.id));
    })
  );

  // 2. Get current user
  const currentSnap = await firestoreAdmin.doc(`users/${currentUid}`).get();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const me = currentSnap.data() as any;
  if (!me) return [];

  const myAge = me.dob ? calculateAge(me.dob) : null;
  const myGender = me.gender;
  const myName = me.fullName || me.username || "";
  const myProfession = (me.work || me.company || "").toLowerCase();
  const myLocation = (me.location || me.country || "").toLowerCase();

  // 3. Fetch 150 users (big pool)
  const poolSnap = await firestoreAdmin
    .collection("users")
    // .orderBy("lastSeen", "desc")
    .limit(150)
    .get();

  const candidates: (UserProps & { score: number })[] = [];

  poolSnap.forEach(doc => {
    const data = doc.data();
    const uid = doc.id;
    if (exclude.has(uid)) return;

    let score = 10;

    // Name similarity
    const nameScore = fuzzyMatch(myName, data.fullName || data.username || "");
    if (nameScore > 0.7) score += 9;

    // Age match (±5)
    if (myAge && data.dob) {
      const theirAge = calculateAge(data.dob);
      if (theirAge && Math.abs(myAge - theirAge) <= 5) score += 8;
    }

    // Opposite gender
    if (myGender && data.gender && data.gender !== myGender) score += 7;

    // Same profession/company
    const theirWork = (data.work || data.company || "").toLowerCase();
    if (myProfession && theirWork.includes(myProfession)) score += 6;

    // Same city/country
    const theirLoc = (data.location || data.country || "").toLowerCase();
    if (myLocation && theirLoc.includes(myLocation)) score += 5;

    // Active in last 7 days
    if (data.lastSeen) {
      const daysAgo = (Date.now() - data.lastSeen.toDate().getTime()) / 864e5;
      if (daysAgo < 7) score += 4;
    }

    // Has photo & completed profile
    if (data.photoURL) score += 3;
    if (data.completedProfile) score += 2;

    candidates.push({
      uid,
      username: data.username,
      photoURL: data.photoURL || null,
      fullName: data.fullName || null,
      dob: data.dob || null,
      gender: data.gender || null,
      location: data.location || null,
      country: data.country || null,
      work: data.work || null,
      company: data.company || null,
      followingCount: data.followingCount || 0,
      followersCount: data.followersCount || 0,
      friendsCount: data.friendsCount || 0,
      postsCount: data.postsCount || 0,
      createdAt: data.createdAt?.toDate() || null,
      completedProfile: data.completedProfile || false,
      score,
    });
  });

  // SMART MATCHES
  const smart = candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ score, ...u }) => u);

  // FALLBACK: If no smart matches → get 6 random active users
  if (smart.length === 0) {
    console.log("No smart matches → using fallback");
    const fallbackSnap = await firestoreAdmin
      .collection("users")
      .orderBy("lastSeen", "desc")
      .limit(50)
      .get();

    const fallback: UserProps[] = [];
    for (const doc of fallbackSnap.docs) {
      if (fallback.length >= 6) break;
      const uid = doc.id;
      if (exclude.has(uid)) continue;
      const data = doc.data();
      fallback.push({
        uid,
        username: data.username,
        photoURL: data.photoURL || null,
        fullName: data.fullName || null,
        location: data.location || null,
        work: data.work || null,
        company: data.company || null,
        followingCount: data.followingCount || 0,
        followersCount: data.followersCount || 0,
        friendsCount: data.friendsCount || 0,
        postsCount: data.postsCount || 0,
        createdAt: data.createdAt?.toDate() || null,
        completedProfile: data.completedProfile || false,
      });
    }
    return fallback;
  }

  return smart;
}
