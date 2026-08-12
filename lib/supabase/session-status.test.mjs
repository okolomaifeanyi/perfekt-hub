import test from "node:test";
import assert from "node:assert/strict";
import {
  canSyncUserProfile,
  hasAuthenticatedSession,
} from "./session-status.mjs";

test("hasAuthenticatedSession rejects missing access tokens", () => {
  assert.equal(hasAuthenticatedSession(null), false);
  assert.equal(hasAuthenticatedSession({ user: { id: "user-1" } }), false);
  assert.equal(
    hasAuthenticatedSession({ access_token: "token", user: null }),
    false
  );
});

test("canSyncUserProfile rejects stale sessions", () => {
  assert.equal(
    canSyncUserProfile(
      { id: "user-1" },
      { access_token: "token", user: { id: "user-2" } }
    ),
    false
  );
  assert.equal(
    canSyncUserProfile({ id: "user-1" }, { user: { id: "user-1" } }),
    false
  );
});

test("canSyncUserProfile accepts matching authenticated sessions", () => {
  assert.equal(
    canSyncUserProfile(
      { id: "user-1" },
      { access_token: "token", user: { id: "user-1" } }
    ),
    true
  );
});
