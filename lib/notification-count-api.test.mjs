import assert from "node:assert/strict";
import test from "node:test";
import { fetchUnreadNotificationCount } from "./notification-count-api.mjs";

test("fetchUnreadNotificationCount calls the unread-count endpoint with authorization when provided", async () => {
  let capturedRequest = null;

  const fetchImpl = async (url, init) => {
    capturedRequest = { url, init };

    return {
      ok: true,
      async json() {
        return { count: 7 };
      },
    };
  };

  const count = await fetchUnreadNotificationCount({
    fetchImpl,
    accessToken: "token-123",
  });

  assert.equal(count, 7);
  assert.deepEqual(capturedRequest, {
    url: "/api/notifications/unread-count",
    init: {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: {
        Authorization: "Bearer token-123",
      },
    },
  });
});
