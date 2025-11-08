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
  return isNaN(birthYear) ? null : new Date().getFullYear() - birthYear;
}

// Helper: get all IDs from a subcollection
async function getIds(path: string): Promise<Set<string>> {
  const snap = await firestoreAdmin.collection(path).get();
  return new Set(snap.docs.map(d => d.id));
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
    excludePaths.map(p => getIds(p).then(s => s.forEach(id => exclude.add(id))))
  );

  // 2. Get current user
  const meSnap = await firestoreAdmin.doc(`users/${currentUid}`).get();
  const me = meSnap.data();
  if (!me) return [];

  const myAge = me.dob ? calculateAge(me.dob) : null;
  const myGender = me.gender;
  const myName = me.fullName || me.username || "";
  const myProfession = (me.work || me.company || "").toLowerCase();
  const myLocation = (me.location || me.country || "").toLowerCase();

  // 3. 2ND-DEGREE: friends-of-friends + followers of followed
  const secondDegree = new Set<string>();

  // Friends' friends
  const friends = await getIds(`users/${currentUid}/friends`);
  await Promise.all(
    Array.from(friends).map(async fid => {
      const fof = await getIds(`users/${fid}/friends`);
      fof.forEach(id => secondDegree.add(id));
    })
  );

  // Followers of people you follow
  const following = await getIds(`users/${currentUid}/following`);
  await Promise.all(
    Array.from(following).map(async fid => {
      const followers = await getIds(`users/${fid}/followers`);
      followers.forEach(id => secondDegree.add(id));
    })
  );

  // Remove self + known
  secondDegree.delete(currentUid);
  exclude.forEach(id => secondDegree.delete(id));

  // 4. Fetch 2nd-degree users + big pool
  const candidates: (UserProps & { score: number; source: string })[] = [];

  // Fetch 2nd-degree first
  if (secondDegree.size > 0) {
    const chunks: string[][] = [];
    const arr = Array.from(secondDegree);
    for (let i = 0; i < arr.length; i += 10) chunks.push(arr.slice(i, i + 10));

    await Promise.all(
      chunks.map(async chunk => {
        const snap = await firestoreAdmin
          .collection("users")
          .where("uid", "in", chunk)
          .get();
        snap.forEach(doc => {
          const data = doc.data();
          const uid = doc.id;
          if (exclude.has(uid)) return;

          let score = 100; // High base for 2nd-degree

          // Boost for mutual connections
          if (friends.has(uid) || following.has(uid)) score += 20;

          // Name, age, etc.
          const nameScore = fuzzyMatch(
            myName,
            data.fullName || data.username || ""
          );
          if (nameScore > 0.7) score += 9;
          if (myAge && data.dob) {
            const theirAge = calculateAge(data.dob);
            if (theirAge && Math.abs(myAge - theirAge) <= 5) score += 8;
          }
          if (myGender && data.gender && data.gender !== myGender) score += 7;
          const theirWork = (data.work || data.company || "").toLowerCase();
          if (myProfession && theirWork.includes(myProfession)) score += 6;
          const theirLoc = (data.location || data.country || "").toLowerCase();
          if (myLocation && theirLoc.includes(myLocation)) score += 5;
          // if (data.lastSeen) {
          //   const daysAgo =
          //     (Date.now() - data.lastSeen.toDate().getTime()) / 864e5;
          //   if (daysAgo < 7) score += 4;
          // }
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
            source: "2nd-degree",
          });
        });
      })
    );
  }

  // 5. Fallback: 150 active users (if not enough 2nd-degree)
  if (candidates.length < 12) {
    const poolSnap = await firestoreAdmin
      .collection("users")
      .limit(150)
      .get();

    poolSnap.forEach(doc => {
      const data = doc.data();
      const uid = doc.id;
      if (exclude.has(uid) || secondDegree.has(uid)) return;

      let score = 10;
      const nameScore = fuzzyMatch(
        myName,
        data.fullName || data.username || ""
      );
      if (nameScore > 0.7) score += 9;
      if (myAge && data.dob) {
        const theirAge = calculateAge(data.dob);
        if (theirAge && Math.abs(myAge - theirAge) <= 5) score += 8;
      }
      if (myGender && data.gender && data.gender !== myGender) score += 7;
      const theirWork = (data.work || data.company || "").toLowerCase();
      if (myProfession && theirWork.includes(myProfession)) score += 6;
      const theirLoc = (data.location || data.country || "").toLowerCase();
      if (myLocation && theirLoc.includes(myLocation)) score += 5;
      // if (data.lastSeen) {
      //   const daysAgo = (Date.now() - data.lastSeen.toDate().getTime()) / 864e5;
      //   if (daysAgo < 7) score += 4;
      // }
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
        source: "random",
      });
    });
  }

  // 6. Return top 12, deduped, no repeats
  const seen = new Set<string>();
  return (
    candidates
      .sort((a, b) => b.score - a.score)
      .filter(u => {
        if (seen.has(u.uid)) return false;
        seen.add(u.uid);
        return true;
      })
      .slice(0, 12)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ score, source, ...u }) => u)
  );
}
