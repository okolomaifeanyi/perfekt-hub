import { getCurrentUid } from "@/app/actions";
import {
  sendFriendRequest,
} from "@/app/actions/connections";
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
    // store pending request
    const result = await sendFriendRequest(currentUid, targetUid);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error sending friend request:", err);
    return NextResponse.json(
      { error: "Failed to send friend request" },
      { status: 500 }
    );
  }
}
