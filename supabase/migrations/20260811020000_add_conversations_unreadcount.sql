-- Conversation creation (hooks/useDirectMessage.ts, components/inbox/MessagePage.tsx)
-- writes a Firestore-style "unreadCount" map keyed by participant uid, updated
-- via dot-path writes like "unreadCount.<uid>" (see Composer.tsx, ForwardModal.tsx).
-- The Firestore shim's mergeDeep() reconstructs those into a nested JSON object
-- under a single "unreadcount" column, same as reactioncounts on posts. That
-- column was never created, so starting a conversation failed with PGRST204.
alter table public.conversations
  add column if not exists unreadcount jsonb not null default '{}'::jsonb;
