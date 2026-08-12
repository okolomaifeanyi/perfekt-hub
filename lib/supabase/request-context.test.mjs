import assert from "node:assert/strict";
import test from "node:test";
import {
  getCurrentSupabaseClient,
  runWithSupabaseClient,
} from "./request-context.mjs";

test("runWithSupabaseClient scopes the current client", async () => {
  const client = { name: "request-client" };

  assert.equal(getCurrentSupabaseClient(), null);

  const result = await runWithSupabaseClient(client, async () => {
    assert.equal(getCurrentSupabaseClient(), client);
    await Promise.resolve();
    return getCurrentSupabaseClient();
  });

  assert.equal(result, client);
  assert.equal(getCurrentSupabaseClient(), null);
});
