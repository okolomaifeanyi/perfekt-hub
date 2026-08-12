import assert from "node:assert/strict";
import test from "node:test";
import { fromSupabaseUserRow, toSupabaseUserRow } from "./user-profile.mjs";

test("toSupabaseUserRow maps camelCase profile fields to lowercase columns", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const lastLoginAt = new Date("2026-01-02T00:00:00.000Z");

  const row = toSupabaseUserRow({
    uid: "user-1",
    email: "user@example.com",
    username: "user",
    fullName: "Test User",
    photoURL: "https://example.com/avatar.png",
    phoneNumber: "+2348012345678",
    completedProfile: true,
    postsCount: 3,
    followersCount: 4,
    followingCount: 5,
    friendsCount: 6,
    providerId: "google",
    createdAt,
    lastLoginAt,
    fullName_lowercase: "test user",
    randomKey: 0.25,
  });

  assert.deepEqual(row, {
    uid: "user-1",
    email: "user@example.com",
    username: "user",
    fullname: "Test User",
    photourl: "https://example.com/avatar.png",
    phonenumber: "+2348012345678",
    completedprofile: true,
    postscount: 3,
    followerscount: 4,
    followingcount: 5,
    friendscount: 6,
    providerid: "google",
    createdat: createdAt,
    lastloginat: lastLoginAt,
    fullname_lowercase: "test user",
    randomkey: 0.25,
  });
});

test("fromSupabaseUserRow maps lowercase columns to app profile fields", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const lastSeen = new Date("2026-01-03T12:30:00.000Z");

  const profile = fromSupabaseUserRow({
    uid: "user-1",
    email: "user@example.com",
    username: "test-user",
    fullname: "Test User",
    photourl: "https://example.com/avatar.png",
    phonenumber: "+2348012345678",
    gender: "male",
    dob: "January 01, 1990",
    education: "University",
    company: "Perfekt",
    linkedin: "https://linkedin.com/in/test",
    github: "https://github.com/test",
    twitter: "https://twitter.com/test",
    work: "Engineer",
    instagram: "https://instagram.com/test",
    relationship: "single",
    country: "Nigeria",
    fullname_lowercase: "test user",
    completedprofile: false,
    postscount: "3",
    followerscount: 4,
    followingcount: 5,
    friendscount: 6,
    online: true,
    lastseen: lastSeen.toISOString(),
    createdat: createdAt.toISOString(),
  });

  assert.deepEqual(profile, {
    uid: "user-1",
    email: "user@example.com",
    username: "test-user",
    fullName: "Test User",
    photoURL: "https://example.com/avatar.png",
    phoneNumber: "+2348012345678",
    gender: "male",
    dob: "January 01, 1990",
    education: "University",
    company: "Perfekt",
    linkedin: "https://linkedin.com/in/test",
    github: "https://github.com/test",
    twitter: "https://twitter.com/test",
    work: "Engineer",
    instagram: "https://instagram.com/test",
    relationship: "single",
    country: "Nigeria",
    fullName_lowercase: "test user",
    completedProfile: true,
    postsCount: 3,
    followersCount: 4,
    followingCount: 5,
    friendsCount: 6,
    online: true,
    lastSeen,
    createdAt,
  });
});
