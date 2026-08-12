import assert from "node:assert/strict";
import test from "node:test";
import {
  generateUniqueUsername,
  getUserProfileByUid,
  lookupEmailByUsername,
  syncUserProfileViaRpc,
} from "./user-profile-rpc.mjs";

test("generateUniqueUsername calls the security-definer RPC", async () => {
  let capturedCall = null;
  const supabase = {
    rpc: async (fn, args) => {
      capturedCall = { fn, args };
      return { data: "alice-1", error: null };
    },
  };

  const username = await generateUniqueUsername(supabase, "  Alice  ");

  assert.deepEqual(capturedCall, {
    fn: "generate_unique_username",
    args: { base_name: "alice" },
  });
  assert.equal(username, "alice-1");
});

test("lookupEmailByUsername calls the security-definer RPC", async () => {
  let capturedCall = null;
  const supabase = {
    rpc: async (fn, args) => {
      capturedCall = { fn, args };
      return { data: "alice@example.com", error: null };
    },
  };

  const email = await lookupEmailByUsername(supabase, "  Alice  ");

  assert.deepEqual(capturedCall, {
    fn: "lookup_user_email_by_username",
    args: { input_username: "alice" },
  });
  assert.equal(email, "alice@example.com");
});

test("getUserProfileByUid returns a normalized profile", async () => {
  const supabase = {
    rpc: async () => ({
      data: {
        uid: "user-1",
        email: "alice@example.com",
        username: "alice",
        fullname: "Alice",
        photourl: "https://example.com/avatar.png",
        completedprofile: true,
        postscount: 7,
        followerscount: 8,
        followingcount: 9,
        friendscount: 10,
        fullname_lowercase: "alice",
        createdat: "2026-01-01T00:00:00.000Z",
        lastloginat: "2026-01-02T00:00:00.000Z",
      },
      error: null,
    }),
  };

  const profile = await getUserProfileByUid(supabase, "user-1");

  assert.deepEqual(profile, {
    uid: "user-1",
    email: "alice@example.com",
    username: "alice",
    fullName: "Alice",
    photoURL: "https://example.com/avatar.png",
    fullName_lowercase: "alice",
    completedProfile: true,
    postsCount: 7,
    followersCount: 8,
    followingCount: 9,
    friendsCount: 10,
    lastSeen: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  });
});

test("syncUserProfileViaRpc sends a Supabase row payload", async () => {
  let capturedCall = null;
  const supabase = {
    rpc: async (fn, args) => {
      capturedCall = { fn, args };
      return {
        data: {
          uid: "user-1",
          email: "alice@example.com",
          username: "alice",
          fullname: "Alice",
          photourl: "https://example.com/avatar.png",
          completedprofile: false,
          postscount: 1,
          followerscount: 2,
          followingcount: 3,
          friendscount: 4,
          fullname_lowercase: "alice",
          createdat: "2026-01-01T00:00:00.000Z",
          lastloginat: "2026-01-02T00:00:00.000Z",
        },
        error: null,
      };
    },
  };

  const profile = await syncUserProfileViaRpc(supabase, {
    uid: "user-1",
    email: "alice@example.com",
    username: "alice",
    fullName: "Alice",
    photoURL: "https://example.com/avatar.png",
    completedProfile: false,
    postsCount: 1,
    followersCount: 2,
    followingCount: 3,
    friendsCount: 4,
    providerId: "supabase",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    lastLoginAt: new Date("2026-01-02T00:00:00.000Z"),
    fullName_lowercase: "alice",
    randomKey: 0.1234,
  });

  assert.deepEqual(capturedCall, {
    fn: "sync_user_profile",
    args: {
      profile: {
        uid: "user-1",
        email: "alice@example.com",
        username: "alice",
        fullname: "Alice",
        photourl: "https://example.com/avatar.png",
        completedprofile: false,
        postscount: 1,
        followerscount: 2,
        followingcount: 3,
        friendscount: 4,
        providerid: "supabase",
        createdat: new Date("2026-01-01T00:00:00.000Z"),
        lastloginat: new Date("2026-01-02T00:00:00.000Z"),
        fullname_lowercase: "alice",
        randomkey: 0.1234,
      },
    },
  });

  assert.deepEqual(profile, {
    uid: "user-1",
    email: "alice@example.com",
    username: "alice",
    fullName: "Alice",
    photoURL: "https://example.com/avatar.png",
    fullName_lowercase: "alice",
    completedProfile: false,
    postsCount: 1,
    followersCount: 2,
    followingCount: 3,
    friendsCount: 4,
    lastSeen: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  });
});
