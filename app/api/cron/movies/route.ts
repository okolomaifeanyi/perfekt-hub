import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorizedCronResponse } from "@/lib/cron/auth.mjs";
import { runMoviesIngestion } from "@/lib/cron/ingest/movies.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedCronResponse();

  try {
    const result = await runMoviesIngestion();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/cron/movies", error);
    return NextResponse.json({ error: "Movies ingestion failed" }, { status: 500 });
  }
}
