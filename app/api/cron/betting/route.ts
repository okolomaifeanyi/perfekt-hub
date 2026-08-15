import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorizedCronResponse } from "@/lib/cron/auth.mjs";
import { runBettingIngestion } from "@/lib/cron/ingest/betting.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedCronResponse();

  try {
    const result = await runBettingIngestion();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/cron/betting", error);
    return NextResponse.json({ error: "Betting ingestion failed" }, { status: 500 });
  }
}
