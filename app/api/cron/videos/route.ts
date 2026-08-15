import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorizedCronResponse } from "@/lib/cron/auth.mjs";
import { runVideosIngestion } from "@/lib/cron/ingest/videos.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedCronResponse();

  try {
    const result = await runVideosIngestion();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/cron/videos", error);
    return NextResponse.json({ error: "Videos ingestion failed" }, { status: 500 });
  }
}
