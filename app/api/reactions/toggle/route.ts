// /api/reactions/toggle/route.ts

import { toggleLikeDislikeAdmin } from "@/components/actions";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { postId, userId, type } = body;

  const updatedCounts = await toggleLikeDislikeAdmin({ postId, userId, type });

  return NextResponse.json(updatedCounts);
}
