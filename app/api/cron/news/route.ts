import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorizedCronResponse } from "@/lib/cron/auth.mjs";
import { runNewsIngestion } from "@/lib/cron/ingest/news.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedCronResponse();

  try {
    const result = await runNewsIngestion();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/cron/news", error);
    return NextResponse.json({ error: "News ingestion failed" }, { status: 500 });
  }
}
