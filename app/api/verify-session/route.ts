import { NextResponse } from "next/server";
import { authAdmin } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { sessionCookie } = await req.json();

    if (!sessionCookie) {
      return NextResponse.json(
        { isValid: false, message: "No session cookie provided" },
        { status: 400 }
      );
    }

    // Verify the session cookie with Firebase Admin SDK
    // The `checkRevoked` parameter (true) is crucial here.
    // It ensures that the token's revocation status is checked,
    // which catches cases where the user is deleted or refresh tokens are revoked.
    const decodedClaims = await authAdmin.verifySessionCookie(
      sessionCookie,
      true
    );

    // Optionally, you can also check if the user still exists in Firebase Auth
    // This adds another layer of verification in case the session cookie
    // was somehow valid but the user object itself was removed.
    try {
      await authAdmin.getUser(decodedClaims.uid);
    } catch (error) {
      console.error(
        "User corresponding to session cookie does not exist:",
        error
      );
      return NextResponse.json(
        { isValid: false, message: "User account deleted or not found" },
        { status: 401 }
      );
    }

    // If verification succeeds and user exists, return success
    return NextResponse.json(
      { isValid: true, uid: decodedClaims.uid },
      { status: 200 }
    );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.warn("⚠️ Session verification API failed:", error.message);
    // Return false if verification fails for any reason (e.g., expired, revoked, malformed)
    return NextResponse.json(
      { isValid: false, message: error.message },
      { status: 401 }
    );
  }
}
