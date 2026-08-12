import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  "supabase/migrations/20260606000000_sync_auth_users_to_profiles.sql"
);

test("auth user profile migration creates a trigger-backed profile sync", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /create schema if not exists app_private/i);
  assert.match(sql, /create or replace function app_private\.handle_new_user/i);
  assert.match(sql, /after insert on auth\.users/i);
  assert.match(sql, /insert into public\.users/i);
  assert.match(sql, /left join public\.users existing_user/i);
  assert.match(sql, /existing_user\.uid = au\.id::text/i);
  assert.match(sql, /new\.id::text/i);
  assert.match(sql, /auth_user\.id::text/i);
  assert.match(sql, /raw_app_meta_data/i);
  assert.doesNotMatch(sql, /"(fullName|photoURL|completedProfile|postsCount|followersCount|followingCount|friendsCount|providerId|createdAt|lastLoginAt|fullName_lowercase|randomKey)"/i);
  assert.match(
    sql,
    /\n\s+fullname,\n\s+photourl,\n\s+completedprofile,\n\s+postscount,\n\s+followerscount,\n\s+followingcount,\n\s+friendscount,\n\s+providerid,\n\s+createdat,\n\s+lastloginat,\n\s+fullname_lowercase,\n\s+randomkey/i
  );
});
