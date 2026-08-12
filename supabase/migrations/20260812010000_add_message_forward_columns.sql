-- Composer.tsx and ForwardModal.tsx have been inserting a "media: null"
-- value against messages.media's NOT NULL column (fixed alongside this
-- migration in application code — the value is now omitted instead of
-- sent as null, so the column's default applies) and ForwardModal.tsx
-- has also been sending "forwarded"/"originalSender" fields with no
-- backing column at all. Every message send and every forward has been
-- failing outright as a result. This adds the missing columns so a
-- forwarded message can actually be flagged and attributed in the UI.
alter table public.messages
  add column if not exists forwarded boolean not null default false,
  add column if not exists originalsender text references public.users(uid) on delete set null;
