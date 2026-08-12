import assert from "node:assert/strict";
import test from "node:test";

import { fetchMessageSearchUsers } from "./message-search-api.mjs";

test("fetchMessageSearchUsers calls the search endpoint", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      json: async () => ({
        users: [{ uid: "u1", username: "alice" }],
      }),
    };
  };

  const users = await fetchMessageSearchUsers({
    query: "alice",
    fetchImpl,
  });

  assert.deepEqual(users, [{ uid: "u1", username: "alice" }]);
  assert.equal(calls[0].url, "/api/search?q=alice");
  assert.equal(calls[0].init.cache, "no-store");
});
