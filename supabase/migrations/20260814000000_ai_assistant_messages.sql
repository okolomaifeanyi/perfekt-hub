-- Single continuous AI assistant conversation per user (no multi-thread
-- management for v1 — a clean extension later if needed, but a linear
-- history already delivers the full "chat with an AI assistant" feature).
create table if not exists public.ai_messages (
  id text primary key,
  uid text not null references public.users(uid) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  createdat timestamptz not null default now()
);

create index if not exists ai_messages_uid_createdat_idx on public.ai_messages (uid, createdat);

alter table public.ai_messages enable row level security;
grant select, insert, delete on public.ai_messages to authenticated;
grant select, insert, update, delete on public.ai_messages to service_role;

drop policy if exists "ai_messages_own_select" on public.ai_messages;
create policy "ai_messages_own_select" on public.ai_messages
  for select to authenticated using (auth.uid()::text = uid);

drop policy if exists "ai_messages_own_insert" on public.ai_messages;
create policy "ai_messages_own_insert" on public.ai_messages
  for insert to authenticated with check (auth.uid()::text = uid);

drop policy if exists "ai_messages_own_delete" on public.ai_messages;
create policy "ai_messages_own_delete" on public.ai_messages
  for delete to authenticated using (auth.uid()::text = uid);
