-- pinPost() (app/(dashboard)/[username]/[postId]/components/utils.ts) writes
-- "pinned"/"pinnedAt" fields, but PostCard.tsx and PostProps both read back
-- "isPinned" instead — a name mismatch on top of a genuinely missing column,
-- so "Pin Post" has always failed with PGRST204.
alter table public.posts
  add column if not exists ispinned boolean not null default false;
