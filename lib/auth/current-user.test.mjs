import assert from "node:assert/strict";
import test from "node:test";

import { resolveCurrentUid } from "./current-user.mjs";

test("resolveCurrentUid prefers the current session user", async () => {
  let getSessionCalled = false;

  const supabase = {
    auth: {
      async getUser() {
        return {
          data: {
            user: { id: "session-user" },
          },
          error: null,
        };
      },
      async getSession() {
        getSessionCalled = true;
        return {
          data: { session: null },
          error: null,
        };
      },
    },
  };

  const uid = await resolveCurrentUid({ supabase, bearerToken: "Bearer token" });

  assert.equal(uid, "session-user");
  assert.equal(getSessionCalled, false);
});

test("resolveCurrentUid falls back to bearer token verification", async () => {
  let receivedToken = null;

  const supabase = {
    auth: {
      async getUser(token) {
        receivedToken = token;
        if (token) {
          return {
            data: { user: { id: "bearer-user" } },
            error: null,
          };
        }
        return {
          data: { user: null },
          error: null,
        };
      },
    },
  };

  const uid = await resolveCurrentUid({ supabase, bearerToken: "Bearer token-123" });

  assert.equal(uid, "bearer-user");
  assert.equal(receivedToken, "token-123");
});
