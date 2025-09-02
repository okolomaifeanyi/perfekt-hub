// app/api/friends/[uid]/disconnect/route.ts

import { getCurrentUid } from "@/app/actions";
import { unfriendUser, unfollowUser } from "@/components/actions";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ targetUid: string }> }
) {
  const uidOrResponse = await getCurrentUid(req);
  if ("status" in uidOrResponse) return uidOrResponse;

  const currentUid = uidOrResponse.uid;
  const { targetUid: otherUid } = await params;

  try {
    // remove mutual friendship if it exists
    await unfriendUser(currentUid, otherUid);

    // also remove follow relationship both ways
    await unfollowUser(currentUid, otherUid);
    await unfollowUser(otherUid, currentUid);

    return NextResponse.json({ success: true, status: "none" });
  } catch (err) {
    console.error("disconnect error:", err);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
