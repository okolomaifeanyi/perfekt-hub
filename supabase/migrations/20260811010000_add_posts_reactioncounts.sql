-- toggleLikeDislikeAdmin (app/actions/reactions.ts) writes Firestore-style
-- dot-path updates like "reactionCounts.like", which the Firestore shim's
-- mergeDeep() reconstructs into a nested JSON object under a single
-- "reactioncounts" column before sending it to PostgREST. That column was
-- never created, so every like/dislike has failed with PGRST204 since the
-- Firestore-to-Supabase migration.
alter table public.posts
  add column if not exists reactioncounts jsonb not null default '{}'::jsonb;
