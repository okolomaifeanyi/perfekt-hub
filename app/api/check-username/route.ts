// app/api/check-username/route.ts
import { firestoreAdmin } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { available: false, error: "Username is required" },
      { status: 400 }
    );
  }

  const snapshot = await firestoreAdmin
    .collection("users")
    .where("username", "==", username)
    .limit(1)
    .get();

  const available = snapshot.empty;

  return NextResponse.json({ available });
}
