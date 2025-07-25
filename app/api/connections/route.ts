// app/api/connections/route.ts

import { NextRequest } from "next/server";
import { firestoreAdmin } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get("uid");

  if (!uid) {
    return new Response("Missing UID", { status: 400 });
  }

  try {
    const [friendsSnap, followingSnap, watchedSnap] = await Promise.all([
      firestoreAdmin.collection(`users/${uid}/friends`).get(),
      firestoreAdmin.collection(`users/${uid}/following`).get(),
      firestoreAdmin.collection(`users/${uid}/watched`).get(),
    ]);

    const friends = friendsSnap.docs.map(doc => doc.id);
    const following = followingSnap.docs.map(doc => doc.id);
    const watched = watchedSnap.docs.map(doc => doc.id);

    return Response.json({ friends, following, watched });
  } catch (error) {
    console.error("Failed to fetch connections:", error);
    return new Response("Server error", { status: 500 });
  }
}
