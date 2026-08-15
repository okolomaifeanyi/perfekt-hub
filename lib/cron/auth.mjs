// Every ingestion route is a public URL (Vercel Cron and Supabase pg_net
// both call in over plain HTTP, neither can hold a session), so this is the
// only thing standing between the internet and a route that writes to the
// database — check it before doing anything else in every route handler.
export function isAuthorizedCronRequest(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export function unauthorizedCronResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
