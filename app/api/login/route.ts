import { NextRequest, NextResponse } from "next/server";
import { authAdmin } from "@/lib/firebaseAdmin"; // Your server-side Admin SDK
import { cookies } from "next/headers"; // To set cookies

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json(
        { message: "ID token is required" },
        { status: 400 }
      );
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

    const sessionCookie = await authAdmin.createSessionCookie(idToken, {
      expiresIn,
    });

    (await cookies()).set("session", sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use secure in production
      path: "/", // Available across the entire application
      sameSite: "lax", // CSRF protection
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


