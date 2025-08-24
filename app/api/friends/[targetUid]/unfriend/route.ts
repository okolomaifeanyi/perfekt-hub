// app/api/friends/[uid]/disconnect/route.ts

import { getCurrentUid } from "@/app/actions";
import { unfriendUser } from "@/components/actions";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const uidOrResponse = await getCurrentUid(req);
  if ("status" in uidOrResponse) return uidOrResponse;

  const currentUid = uidOrResponse.uid;

  const { uid: otherUid } = await params;

  try {
    await unfriendUser(currentUid, otherUid);

    return NextResponse.json({ success: true, status: "none" });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
