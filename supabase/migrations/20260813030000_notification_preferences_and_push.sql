-- Notification preferences (per-category, per-channel) and browser push
-- subscriptions. Email/SMS toggles exist in the UI for completeness but
-- there's no email/SMS provider configured in this project, so those
-- channels never actually send anything yet — only push (native browser
-- notifications via the service worker already added for PWA support).
create table if not exists public.notification_preferences (
  uid text primary key references public.users(uid) on delete cascade,
  push_enabled boolean not null default true,
  email_enabled boolean not null default false,
  sms_enabled boolean not null default false,
  notify_likes boolean not null default true,
  notify_comments boolean not null default true,
  notify_follows boolean not null default true,
  notify_messages boolean not null default true,
  notify_groups boolean not null default true,
  updatedat timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
grant select, insert, update on public.notification_preferences to authenticated;
grant select, insert, update, delete on public.notification_preferences to service_role;

drop policy if exists "notification_preferences_own_select" on public.notification_preferences;
create policy "notification_preferences_own_select" on public.notification_preferences
  for select to authenticated using (auth.uid()::text = uid);

drop policy if exists "notification_preferences_own_insert" on public.notification_preferences;
create policy "notification_preferences_own_insert" on public.notification_preferences
  for insert to authenticated with check (auth.uid()::text = uid);

drop policy if exists "notification_preferences_own_update" on public.notification_preferences;
create policy "notification_preferences_own_update" on public.notification_preferences
  for update to authenticated using (auth.uid()::text = uid) with check (auth.uid()::text = uid);

create table if not exists public.push_subscriptions (
  id text primary key,
  uid text not null references public.users(uid) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  createdat timestamptz not null default now()
);

create index if not exists push_subscriptions_uid_idx on public.push_subscriptions (uid);

alter table public.push_subscriptions enable row level security;
grant select, insert, delete on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;

drop policy if exists "push_subscriptions_own_select" on public.push_subscriptions;
create policy "push_subscriptions_own_select" on public.push_subscriptions
  for select to authenticated using (auth.uid()::text = uid);

drop policy if exists "push_subscriptions_own_insert" on public.push_subscriptions;
create policy "push_subscriptions_own_insert" on public.push_subscriptions
  for insert to authenticated with check (auth.uid()::text = uid);

drop policy if exists "push_subscriptions_own_delete" on public.push_subscriptions;
create policy "push_subscriptions_own_delete" on public.push_subscriptions
  for delete to authenticated using (auth.uid()::text = uid);
