// app/api/posts/[postId]/view/route.ts
import { getCurrentUid } from "@/app/actions";
import { addUniqueView } from "@/components/actions";
import { NextRequest, NextResponse } from "next/server";


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    // ✅ check auth
    const uidOrResponse = await getCurrentUid(req);
    if ("status" in uidOrResponse) return uidOrResponse; // already a NextResponse

    const currentUid = uidOrResponse.uid;
    const { postId } = await params;

    if (!postId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await addUniqueView(postId, currentUid);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("API addUniqueView:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
