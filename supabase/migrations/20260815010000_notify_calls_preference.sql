-- Incoming calls currently only ever show as an in-app banner — reported
-- live as "the receiver doesn't know they are called", root-caused to
-- Stream's default 15s ring timeout (dashboard-only setting) being too
-- short for anyone not already staring at the tab. A push notification
-- (existing infra — see 20260813030000) reaches the receiver even with
-- the tab backgrounded or closed, which the in-app banner never could.
alter table public.notification_preferences
  add column if not exists notify_calls boolean not null default true;
