export async function fetchMessageSearchUsers({
  query,
  fetchImpl = fetch,
}) {
  const term = String(query ?? "").trim();
  if (!term) return [];

  const response = await fetchImpl(`/api/search?q=${encodeURIComponent(term)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Search request failed with status ${response.status}`);
  }

  const payload = await response.json().catch(() => null);
  if (!payload || !Array.isArray(payload.users)) {
    return [];
  }

  return payload.users;
}
