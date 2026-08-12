import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Supabase Auth is now the session source." },
    { status: 410 }
  );
}
