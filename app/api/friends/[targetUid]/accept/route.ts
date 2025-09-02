import { getCurrentUid } from "@/app/actions";
import {
  acceptFriendRequest,
  followUser,
} from "@/components/actions";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ targetUid: string }> }
) {
  const uidOrResponse = await getCurrentUid(req);
  if ("status" in uidOrResponse) return uidOrResponse;

  const currentUid = uidOrResponse.uid;
  const { targetUid: requesterUid } = await params;

  try {
    // ensure mutual follows
    await Promise.all([
      followUser(currentUid, requesterUid), // acceptor → requester
      followUser(requesterUid, currentUid), // requester → acceptor
    ]);

    // mark request as accepted (move from pending → friends)
    await acceptFriendRequest(currentUid, requesterUid);

    return NextResponse.json({ success: true, status: "friends" });
  } catch (err) {
    console.error("Error accepting friend request:", err);
    
    return NextResponse.json(
      { error: "Failed to accept request" },
      { status: 500 }
    );
  }
}
