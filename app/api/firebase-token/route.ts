import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import { authAdmin } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { uid } = await getUserFromSession(req);
    if (!uid)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = await authAdmin.createCustomToken(uid);
    return NextResponse.json({ token });
  } catch (err) {
    console.error("Failed to create Firebase token", err);
    return NextResponse.json({ error: "Token error" }, { status: 500 });
  }
}
