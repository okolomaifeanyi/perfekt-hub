import { followUser, sendFriendRequest } from "@/components/actions";
import { authAdmin } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ targetUid: string }> }
) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await authAdmin.verifyIdToken(token);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  const currentUid = decoded.uid;

  const { targetUid } = await params;

  if (!currentUid || !targetUid || currentUid === targetUid) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  await sendFriendRequest(currentUid, targetUid);
  await followUser(currentUid, targetUid);

  return NextResponse.json({ success: true });
}
