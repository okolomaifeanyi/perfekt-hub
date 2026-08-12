import assert from "node:assert/strict";
import test from "node:test";
import { syncUserProfile } from "./user-profile-api.mjs";

test("syncUserProfile posts to the profile endpoint and normalizes the response", async () => {
  let capturedRequest = null;

  const fetchImpl = async (url, init) => {
    capturedRequest = { url, init };

    return {
      ok: true,
      async json() {
        return {
          uid: "user-1",
          username: "test-user",
          fullname: "Test User",
          photourl: "https://example.com/avatar.png",
          completedprofile: false,
          postscount: 2,
          followerscount: 4,
          followingcount: 5,
          friendscount: 6,
          createdat: "2026-01-01T00:00:00.000Z",
          lastseen: "2026-01-03T12:30:00.000Z",
        };
      },
    };
  };

  const profile = await syncUserProfile({
    uid: "user-1",
    accessToken: "access-token",
    fetchImpl,
  });

  assert.deepEqual(capturedRequest, {
    url: "/api/user-profile",
    init: {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uid: "user-1" }),
      cache: "no-store",
    },
  });

  assert.deepEqual(profile, {
    uid: "user-1",
    username: "test-user",
    fullName: "Test User",
    photoURL: "https://example.com/avatar.png",
    fullName_lowercase: "test user",
    completedProfile: false,
    postsCount: 2,
    followersCount: 4,
    followingCount: 5,
    friendsCount: 6,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    lastSeen: new Date("2026-01-03T12:30:00.000Z"),
  });
});
