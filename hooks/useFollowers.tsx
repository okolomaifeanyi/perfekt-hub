"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/supabase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  getDoc,
} from "@/lib/supabase";
// import { useUserStore } from "@/lib/store/useUserStore";
import { UserProps } from "@/lib/types";

export function useFollowers(
  userId: string,
  type: "followers" | "following" | "friends"
) {
  const [followers, setFollowers] = useState<UserProps[]>([]);
  const [loading, setLoading] = useState(true);
  //   const currentUser = useUserStore(state => state.user);

  useEffect(() => {
    if (!userId || !type) return;

    setLoading(true);

    const ref = collection(db, `users/${userId}/${type}`);

    let q;
    
    if (type === "friends") {
      q = query(ref, orderBy("since", "desc"));
    } else {
      q = query(ref, orderBy("followedAt", "desc"));
    }

    const unsub = onSnapshot(q, async snap => {
      try {
        const users = await Promise.all(
          snap.docs.map(async docSnap => {
            const targetId = docSnap.id;
            const profileSnap = await getDoc(doc(db, "users", targetId));

            const pdata = profileSnap.exists()
              ? profileSnap.data()
              : { fullName: "Unknown", username: targetId };

            // Optional: check if current user follows them
            // let isFollowing = false;
            // if (currentUser) {
            //   const rel = await getDoc(
            //     doc(db, `users/${currentUser.uid}/following/${targetId}`)
            //   );
            //   isFollowing = rel.exists();
            // }

            //   console.log(pdata);

            return {
              uid: targetId,
              fullName: pdata.fullName,
              username: pdata.username,
              photoURL: pdata.photoURL,
              // isFollowing,
            } as UserProps;
          })
        );

        setFollowers(users);
      } catch (err) {
        console.error("Error fetching followers:", err);
        setFollowers([]);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [userId, type /* , currentUser */]);

  return { followers, loading };
}
