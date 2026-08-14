-- Two more signals from the same enrichPost AI call that already runs after
-- every post (see 20260813040000): an accessibility description of the
-- post's primary image, and a text-toxicity flag for the caption
-- (harassment/hate speech/spam), independent of the existing image-nudity
-- moderationstatus. Both default to "nothing detected yet" and only ever
-- add information — no existing behavior changes until enrichPost runs.
alter table public.posts
  add column if not exists aiimagealttext text;

alter table public.posts
  add column if not exists texttoxic boolean not null default false;
