import { getSmartSuggestions } from "@/components/Features/follow/actions";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { uid } = await req.json();
    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    const suggestions = await getSmartSuggestions(uid);
    return NextResponse.json(suggestions);
  } catch (err) {
    console.error("Failed to get suggestions:", err);
    return NextResponse.json([], { status: 500 });
  }
}
