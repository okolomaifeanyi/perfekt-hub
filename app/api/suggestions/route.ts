import { getSmartSuggestions } from "@/components/Features/follow/actions";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { uid } = await getUserFromSession();
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const suggestions = await getSmartSuggestions(uid);
    return NextResponse.json(suggestions);
  } catch (err) {
    console.error("Failed to get suggestions:", err);
    return NextResponse.json([], { status: 500 });
  }
}
