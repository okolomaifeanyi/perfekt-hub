-- Fixes messages_participant_update/delete (see
-- supabase/migrations/20260530000000_init.sql): the `or exists(...)` clause
-- let ANY participant in a conversation edit or delete a message sent by
-- someone else in that same conversation, via a direct Supabase
-- REST/PostgREST call — independent of what the UI exposes.
-- messages_participant_insert already correctly requires senderId to
-- match; this brings update/delete in line with it — only the message's
-- own sender may update or delete it.
drop policy if exists "messages_participant_update" on public.messages;
create policy "messages_participant_update"
on public.messages
for update
to authenticated
using (auth.uid()::text = senderId)
with check (auth.uid()::text = senderId);

drop policy if exists "messages_participant_delete" on public.messages;
create policy "messages_participant_delete"
on public.messages
for delete
to authenticated
using (auth.uid()::text = senderId);
