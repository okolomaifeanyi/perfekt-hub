// app/api/friends/[targetUid]/status/route.ts

import { firestoreAdmin, authAdmin } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ targetUid: string }> }
) {
  const authHeader = _req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

  let decoded;
  try {
    decoded = await authAdmin.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const uid = decoded.uid;
  const { targetUid } = await params;

  const [friendSnap, receivedSnap, sentSnap, followSnap] = await Promise.all([
    firestoreAdmin.doc(`users/${uid}/friends/${targetUid}`).get(),
    firestoreAdmin
      .doc(`users/${uid}/friendRequestsReceived/${targetUid}`)
      .get(),
    firestoreAdmin.doc(`users/${uid}/friendRequestsSent/${targetUid}`).get(),
    firestoreAdmin.doc(`users/${uid}/following/${targetUid}`).get(),
  ]);

  const isFriend = friendSnap.exists;
  const sentRequest = sentSnap.exists;
  const receivedRequest = receivedSnap.exists;
  const isFollow = followSnap.exists;

  let status: "none" | "following" | "friends" | "requested" | "pending";

  if (isFriend) status = "friends";
  else if (receivedRequest) status = "pending";
  else if (sentRequest) status = "requested";
  else if (isFollow) status = "following";
  else status = "none";

  return NextResponse.json({ status });
}
