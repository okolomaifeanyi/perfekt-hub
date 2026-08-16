import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorizedCronResponse } from "@/lib/cron/auth.mjs";
import { runBirthdayIngestion } from "@/lib/cron/birthdays.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Once a day is enough — birthdays don't change intraday, unlike scores or
// live prices. Runs against every user with a dob set, so cost scales with
// user count rather than a fixed external-API budget the way the other
// cron routes do.
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedCronResponse();

  try {
    const result = await runBirthdayIngestion();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/cron/birthdays", error);
    return NextResponse.json({ error: "Birthday ingestion failed" }, { status: 500 });
  }
}
