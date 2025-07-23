import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { firestoreAdmin } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
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

    const { fullName, phoneNumber, gender, dob, photoURL } = await req.json();

    if (!fullName || !phoneNumber || !gender || !dob || !photoURL) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await firestoreAdmin.collection("users").doc(uid).set(
      {
        fullName,
        phoneNumber,
        gender,
        dob,
        photoURL,
        completedProfileAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in /api/complete-profile", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
