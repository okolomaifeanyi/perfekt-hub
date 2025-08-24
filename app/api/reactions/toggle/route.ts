import { toggleLikeDislikeAdmin } from "@/components/actions";
import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest) {
  try {
    const { postId, userId, type } = await req.json();
    await toggleLikeDislikeAdmin({ postId, userId, type });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error(err);
    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
