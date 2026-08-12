import { NextResponse } from "next/server";
import { fetchMetadata } from "@/lib/links";
import { resolveLinkPreviewRequest } from "@/lib/link-preview-route.mjs";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { uid } = await getUserFromSession();
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await resolveLinkPreviewRequest(request.url, fetchMetadata);

  return NextResponse.json(result.body, {
    status: result.status,
  });
}
