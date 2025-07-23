import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authAdmin } from "@/lib/firebaseAdmin";

export async function POST() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (session) {
    try {
      const decodedClaims = await authAdmin.verifySessionCookie(session, true);
      await authAdmin.revokeRefreshTokens(decodedClaims.uid);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("⚠️ Failed to verify/revoke session:", err);
      }
      // Still proceed to clear cookie
    }
  }

  // ✅ Create the redirect response
  // const response = NextResponse.redirect(
  //   new URL(
  //     "/login",
  //     process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  //   )
  // );
  const response = NextResponse.json(
    { message: "Logged out successfully" },
    { status: 200 }
  );

  // ✅ Explicitly set the expired cookie on the response
  response.cookies.set("session", "", {
    maxAge: 0,
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return response;
}
