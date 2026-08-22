import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorizedCronResponse } from "@/lib/cron/auth.mjs";
import { runMatchSummaryIngestion } from "@/lib/cron/ingest/match-summary.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Kept separate from /api/cron/match-analysis on purpose: this one only
// needs the match detail (no team-form/head-to-head/standings calls), so it
// can afford a larger per-run batch (see MAX_MATCHES_PER_RUN) on the same
// cadence. Scheduled 10 minutes after match-analysis (see vercel.json) so
// the two never compete for football-data.org's shared free-tier rate limit.
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedCronResponse();

  try {
    const result = await runMatchSummaryIngestion();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/cron/match-summary", error);
    return NextResponse.json({ error: "Match summary ingestion failed" }, { status: 500 });
  }
}
