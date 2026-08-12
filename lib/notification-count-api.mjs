export async function fetchUnreadNotificationCount({
  fetchImpl = globalThis.fetch,
  accessToken,
} = {}) {
  const headers = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const requestInit = /** @type {RequestInit} */ ({
    method: "GET",
    cache: "no-store",
    credentials: "include",
    headers: Object.keys(headers).length ? headers : undefined,
  });

  const response = await fetchImpl("/api/notifications/unread-count", requestInit);

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Unable to load unread notifications.";

    throw new Error(message);
  }

  const count = Number(payload?.count ?? 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
}
