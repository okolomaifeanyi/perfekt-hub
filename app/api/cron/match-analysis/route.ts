import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorizedCronResponse } from "@/lib/cron/auth.mjs";
import { runMatchAnalysisIngestion } from "@/lib/cron/ingest/match-analysis.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Kept separate from /api/cron/football on purpose: this one calls a paid
// LLM plus several football-data.org requests per fixture, so it only
// processes a couple of fixtures per run (see MAX_MATCHES_PER_RUN) to stay
// under football-data.org's free-tier rate limit and this function's time
// budget. Runs every 3 hours (see vercel.json) to still work through the
// upcoming-fixture backlog at a reasonable pace — total LLM spend only
// scales with how many distinct fixtures ever get analyzed, not with how
// often this fires, since already-analyzed fixtures are skipped.
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
