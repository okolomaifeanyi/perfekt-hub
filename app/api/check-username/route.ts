import { NextResponse } from "next/server";
import { getSupabasePublicClient } from "@/lib/supabase/client";
import { lookupEmailByUsername } from "@/lib/supabase/user-profile-rpc.mjs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { available: false, error: "Username is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabasePublicClient();
    const email = await lookupEmailByUsername(supabase, username);

    return NextResponse.json({ available: !email });
  } catch (error) {
    console.error("check-username unexpected error:", error);
    return NextResponse.json(
      {
        available: false,
        error: "Username lookup is temporarily unavailable",
      },
      { status: 503 }
    );
  }
}
