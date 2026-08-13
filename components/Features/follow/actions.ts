"use server";

import { cookies } from "next/headers";
import { firestoreAdmin } from "@/lib/supabase";
import { normalizeUnknownError } from "@/lib/supabase/error-utils.mjs";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { runWithSupabaseClient } from "@/lib/supabase/request-context.mjs";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import { UserProps } from "@/lib/types";

function fuzzyMatch(a: string, b: string): number {
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.8;
  // Partial word match
  const wordsA = a.split(" ");
  const wordsB = b.split(" ");
  for (const wa of wordsA) {
    for (const wb of wordsB) {
      if (wa && wb && (wa.includes(wb) || wb.includes(wa))) return 0.6;
    }
  }
  return 0;
}

function calculateAge(dob: string): number | null {
  const [year] = dob.split("-");
  const birthYear = parseInt(year, 10);
  return isNaN(birthYear) ? null : new Date().getFullYear() - birthYear;
}

async function withSupabaseRequestContext<T>(
  callback: () => Promise<T>
): Promise<T> {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: cookieUpdates => {
      cookieUpdates.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    },
  });

  // The @supabase/ssr server client initializes its session lazily
  // (skipAutoInitialize), so no JWT is attached until an auth method runs and
  // every query before that executes as the `anon` role. Hydrate it first so
  // RLS sees the real user.
  await supabase.auth.getUser();

  return runWithSupabaseClient(supabase, callback);
}

// Helper: get all IDs from a subcollection
async function getIds(path: string): Promise<Set<string>> {
  const snap = await firestoreAdmin.collection(path).get();
  return new Set(snap.docs.map(d => d.id));
}

export async function getSmartSuggestions(
  currentUid: string
): Promise<UserProps[]> {
  try {
    const { uid: sessionUid } = await getUserFromSession();
    if (!sessionUid || sessionUid !== currentUid) {
      return [];
    }

    return await withSupabaseRequestContext(async () => {
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
  const myName = (me.fullName || me.username || "").toLowerCase();
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

  // Fetch 2nd-degree in chunks of 10 (Firestore 'in' limit)
  if (secondDegree.size > 0) {
    const chunks: string[][] = [];
    const arr = Array.from(secondDegree);
    for (let i = 0; i < arr.length; i += 10) {
      chunks.push(arr.slice(i, i + 10));
    }

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

          // Name match
          const nameScore = fuzzyMatch(
            myName,
            (data.fullName || data.username || "").toLowerCase()
          );
          if (nameScore > 0.5) score += nameScore > 0.7 ? 12 : 8;

          // Age match (±10 years)
          if (myAge && data.dob) {
            const theirAge = calculateAge(data.dob);
            if (theirAge) {
              const ageDiff = Math.abs(myAge - theirAge);
              if (ageDiff <= 5) score += 10;
              else if (ageDiff <= 10) score += 5;
            }
          }

          // Gender preference
          if (myGender && data.gender && data.gender !== myGender) score += 7;

          // Profession match
          const theirWork = (data.work || data.company || "").toLowerCase();
          if (myProfession && theirWork && theirWork.includes(myProfession)) score += 7;

          // Location match
          const theirLoc = (data.location || data.country || "").toLowerCase();
          if (myLocation && theirLoc && theirLoc.includes(myLocation)) score += 6;

          // Profile quality
          if (data.photoURL) score += 4;
          if (data.completedProfile) score += 3;

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

  // 5. Fallback: 300 pseudo-random users (requires randomScore on users)
  if (candidates.length < 6) {
    const randomSeed = Math.random();
    const poolSnap = await firestoreAdmin
      .collection("users")
      .where("randomKey", ">=", randomSeed)
      .limit(300)
      .get();
  
    // Prepare a docs array; if not enough results, fetch from below seed and merge & shuffle
    let poolDocs = poolSnap.docs;
  
    // If not enough, get from below seed and merge
    if (poolDocs.length < 100) {
      const belowSnap = await firestoreAdmin
        .collection("users")
        .where("randomKey", "<", randomSeed)
        .limit(300)
        .get();
      const allDocs = [...poolDocs, ...belowSnap.docs];
      // Shuffle and take up to 300
      for (let i = allDocs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allDocs[i], allDocs[j]] = [allDocs[j], allDocs[i]];
      }
      poolDocs = allDocs.slice(0, 300);
    }

    const seenUids = new Set(candidates.map(c => c.uid));

    poolDocs.forEach(doc => {
      const data = doc.data();
      const uid = doc.id;
      if (exclude.has(uid) || seenUids.has(uid) || secondDegree.has(uid)) return;
      seenUids.add(uid);

      let score = 35; // Higher base for fallback visibility

      const nameScore = fuzzyMatch(
        myName,
        (data.fullName || data.username || "").toLowerCase()
      );
      if (nameScore > 0.5) score += nameScore > 0.7 ? 12 : 8;

      if (myAge && data.dob) {
        const theirAge = calculateAge(data.dob);
        if (theirAge) {
          const ageDiff = Math.abs(myAge - theirAge);
          if (ageDiff <= 5) score += 10;
          else if (ageDiff <= 10) score += 5;
        }
      }

      if (myGender && data.gender && data.gender !== myGender) score += 6;

      const theirWork = (data.work || data.company || "").toLowerCase();
      if (myProfession && theirWork && theirWork.includes(myProfession)) score += 7;

      const theirLoc = (data.location || data.country || "").toLowerCase();
      if (myLocation && theirLoc && theirLoc.includes(myLocation)) score += 6;

      if (data.photoURL) score += 4;
      if (data.completedProfile) score += 3;

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

  // 6. Return top 12, deduped
  const seen = new Set<string>();
  return candidates
    .sort((a, b) => b.score - a.score)
    .filter(u => {
      if (seen.has(u.uid)) return false;
      seen.add(u.uid);
      return true;
    })
    .slice(0, 12)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ score, source, ...u }) => u);
    });
  } catch (error) {
    console.error(
      "getSmartSuggestions failed:",
      normalizeUnknownError(error, "Unable to load suggestions.")
    );
    return [];
  }
}
