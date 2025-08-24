// app/api/friends/[uid]/accept/route.ts

import { getCurrentUid } from "@/app/actions";
import { acceptFriendRequest, sendNotification } from "@/components/actions";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const uidOrResponse = await getCurrentUid(req);
  if ("status" in uidOrResponse) return uidOrResponse;

  const currentUid = uidOrResponse.uid;
  const { uid: requesterUid } = await params;

  try {
      await acceptFriendRequest(currentUid, requesterUid);
      
      await sendNotification({
        recipientUid: requesterUid,
        actorUid: currentUid,
        type: "acceptRequest",
      });

    return NextResponse.json({ success: true, status: "friends" });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to accept request" },
      { status: 500 }
    );
  }
}
