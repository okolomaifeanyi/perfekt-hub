import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorizedCronResponse } from "@/lib/cron/auth.mjs";
import { runMatchAnalysisIngestion } from "@/lib/cron/ingest/match-analysis.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Kept separate from /api/cron/football on purpose: this one calls a paid
// LLM per fixture, so it runs once a day (see vercel.json) rather than 4x,
// working through the upcoming-fixture backlog a handful at a time instead
// of trying to analyze everything in one run.
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedCronResponse();

  try {
    const result = await runMatchAnalysisIngestion();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/cron/match-analysis", error);
    return NextResponse.json({ error: "Match analysis ingestion failed" }, { status: 500 });
  }
}
