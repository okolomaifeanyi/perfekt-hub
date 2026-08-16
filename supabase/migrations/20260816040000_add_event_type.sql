-- events had no way to distinguish system-generated rows (birthday events,
-- auto-created by a daily cron under the event's own owner) from ones a
-- user created by hand — needed so the UI can label/filter them and so a
-- birthday event can be told apart from a same-titled custom one.
alter table public.events
  add column if not exists eventtype text not null default 'custom';

alter table public.events
  drop constraint if exists events_eventtype_check;

alter table public.events
  add constraint events_eventtype_check check (eventtype in ('custom', 'birthday'));
