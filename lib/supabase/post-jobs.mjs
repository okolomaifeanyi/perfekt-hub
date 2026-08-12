export function canRunPostBackgroundJobs() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}
