-- users.followersCount/followingCount/friendsCount were corrupted by two
-- bugs fixed earlier today in application code:
--   1. FieldValue.increment() resolved against an empty stub instead of the
--      row's real value, so every increment/decrement reset the counter to
--      the increment amount instead of accumulating it.
--   2. usersRef.doc(`${uid}/following/${targetUid}`)-style writes were never
--      split into path segments, so they silently wrote into the top-level
--      `users` table under a garbage compound id instead of `user_relationships`.
-- Fixing the code doesn't repair counts that are already wrong, so
-- reconcile them here against the real relationship rows.
update public.users
set followerscount = (
  select count(*) from public.user_relationships
  where targetuid = users.uid and kind = 'follow'
);

update public.users
set followingcount = (
  select count(*) from public.user_relationships
  where owneruid = users.uid and kind = 'follow'
);

update public.users
set friendscount = (
  select count(*) from public.user_relationships
  where owneruid = users.uid and kind = 'friend'
);
