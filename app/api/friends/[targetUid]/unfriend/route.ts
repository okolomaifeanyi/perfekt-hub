// app/api/friends/[uid]/disconnect/route.ts

import { getCurrentUid } from "@/app/actions";
import { unfriendUser } from "@/app/actions/connections";
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
    await unfriendUser(currentUid, otherUid);

    return NextResponse.json({ success: true, status: "none" });

  } catch (err) {
    console.error("disconnect error:", err);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
