// app/api/user-profile/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";

import { cookies } from "next/headers";
import { firestoreAdmin } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "No session cookie" }, { status: 401 });
    }

    const decodedClaims = await getAuth().verifySessionCookie(
      sessionCookie,
      true
    );
    const uid = decodedClaims.uid;

    const userDoc = await firestoreAdmin.collection("users").doc(uid).get();
    const userData = userDoc.data() || {};

    const completedProfile =
      userData.phoneNumber &&
      userData.gender &&
      userData.dob &&
      userData.photoURL;

    return NextResponse.json({
      ...userData,
      completedProfile: Boolean(completedProfile),
    });
  } catch (err) {
    console.error("Error in /api/user-profile", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
