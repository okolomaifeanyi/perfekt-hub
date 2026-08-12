import assert from "node:assert/strict";
import test from "node:test";
import {
  createRequestSupabaseClient,
  extractBearerToken,
} from "./request-client.mjs";

test("extractBearerToken trims and strips the bearer prefix", () => {
  assert.equal(extractBearerToken("   Bearer   token-123   "), "token-123");
  assert.equal(extractBearerToken("token-123"), null);
  assert.equal(extractBearerToken("   "), null);
});

test("createRequestSupabaseClient uses the server client when a bearer token is provided", () => {
  const createServerClientCalls = [];

  const result = createRequestSupabaseClient({
    authorizationHeader: "Bearer token-123",
    env: {
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    },
    createServerClientImpl: (...args) => {
      createServerClientCalls.push(args);
      return { kind: "server-client" };
    },
  });

  assert.equal(result.bearerToken, "token-123");
  assert.deepEqual(result.supabase, { kind: "server-client" });
  assert.equal(createServerClientCalls.length, 1);
  assert.equal(createServerClientCalls[0][0], "https://example.supabase.co");
  assert.equal(createServerClientCalls[0][1], "anon-key");
  assert.deepEqual(createServerClientCalls[0][2].cookies.getAll(), []);
  assert.deepEqual(createServerClientCalls[0][2].global, {
    headers: { Authorization: "Bearer token-123" },
  });
});

test("createRequestSupabaseClient falls back to the server client when no bearer token exists", () => {
  const createServerClientCalls = [];
  const cookieStore = {
    getAll() {
      return [{ name: "sb-access-token", value: "cookie-token" }];
    },
    setAll() {},
  };

  const result = createRequestSupabaseClient({
    cookieStore,
    env: {
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    },
    createServerClientImpl: (...args) => {
      createServerClientCalls.push(args);
      return { kind: "server-client" };
    },
  });

  assert.equal(result.bearerToken, null);
  assert.deepEqual(result.supabase, { kind: "server-client" });
  assert.equal(createServerClientCalls.length, 1);
  assert.equal(createServerClientCalls[0][0], "https://example.supabase.co");
  assert.equal(createServerClientCalls[0][1], "anon-key");
  assert.deepEqual(createServerClientCalls[0][2].cookies.getAll(), [
    { name: "sb-access-token", value: "cookie-token" },
  ]);
  assert.equal(createServerClientCalls[0][2].global, undefined);
});
