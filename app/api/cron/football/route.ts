import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorizedCronResponse } from "@/lib/cron/auth.mjs";
import { runFootballIngestion } from "@/lib/cron/ingest/football.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Covers fixtures, live scores, and results in one run — a single
// dateFrom..dateTo window per competition naturally spans all three
// statuses, so there's no reason to split this into three routes just
// because the DB models them as three categories. Vercel Cron hits this a
// few times a day for fixtures/results; Supabase pg_cron hits it every 1-2
// minutes during matches for live scores (see the pg_cron migration).
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedCronResponse();

  try {
    const result = await runFootballIngestion();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/cron/football", error);
    return NextResponse.json({ error: "Football ingestion failed" }, { status: 500 });
  }
}
