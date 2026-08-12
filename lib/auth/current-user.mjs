function normalizeBearerToken(bearerToken) {
  if (!bearerToken) return null;

  const trimmed = bearerToken.trim();
  if (!trimmed) return null;

  return trimmed.replace(/^Bearer\s+/i, "").trim() || null;
}

export async function resolveCurrentUid({ supabase, bearerToken }) {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user?.id) {
      return data.user.id;
    }
  } catch {
    // Fall through to bearer token verification.
  }

  const token = normalizeBearerToken(bearerToken);
  if (!token) {
    return null;
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) {
      return null;
    }

    return data.user.id;
  } catch {
    return null;
  }
}
