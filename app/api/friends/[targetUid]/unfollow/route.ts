// app/api/friends/[targetUid]/unfollow/route.ts
import { getCurrentUid } from "@/app/actions";
import { unfollowUser } from "@/app/actions/connections";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ targetUid: string }> }
) {
  const uidOrResponse = await getCurrentUid(req);
  if ("status" in uidOrResponse) return uidOrResponse;

  const currentUid = uidOrResponse.uid;
  const { targetUid } = await params;

  if (currentUid === targetUid) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  try {
    await unfollowUser(currentUid, targetUid);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("unfollow error:", err);
    return NextResponse.json({ error: "Failed to unfollow" }, { status: 500 });
  }
}
