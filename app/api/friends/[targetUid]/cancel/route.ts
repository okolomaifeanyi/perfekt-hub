// app/api/friends/[uid]/cancel/route.ts
import { getCurrentUid } from "@/app/actions";
import { cancelFriendRequest } from "@/components/actions";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ targetUid: string }> }
) {
  const uidOrResponse = await getCurrentUid(req);
  if ("status" in uidOrResponse) return uidOrResponse;

  const currentUid = uidOrResponse.uid;
  const { targetUid } = await params;

  try {
    await cancelFriendRequest(currentUid, targetUid);
    return NextResponse.json({ success: true, status: "none" });
  } catch (err) {
    console.error("cancelFriendRequest error:", err);
    return NextResponse.json(
      { error: "Failed to cancel request" },
      { status: 500 }
    );
  }
}
