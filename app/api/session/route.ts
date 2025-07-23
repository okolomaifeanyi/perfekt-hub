import { NextRequest, NextResponse } from "next/server";
import { authAdmin } from "@/lib/firebaseAdmin";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { token: idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json(
        { message: "ID token is required" },
        { status: 400 }
      );
    }

    // ✅ Step 1: Verify token
    const decoded = await authAdmin.verifyIdToken(idToken);

    // ✅ Step 2: Check that user still exists
    try {
      await authAdmin.getUser(decoded.uid);
    } catch (error) {
      console.error("User does not exist in Firebase Auth:", error);
      return NextResponse.json(
        { message: "User account has been deleted" },
        { status: 401 }
      );
    }

    // ✅ Step 3: Create session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await authAdmin.createSessionCookie(idToken, {
      expiresIn,
    });

    // ✅ Step 4: Set secure cookie
    const cookieStore = await cookies();
    cookieStore.set("session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json(
      { message: "Logged in successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating session cookie:", error);
    return NextResponse.json(
      { message: "Authentication failed" },
      { status: 401 }
    );
  }
}
