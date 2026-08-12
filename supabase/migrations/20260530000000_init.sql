create table if not exists public.users (
  uid text primary key,
  email text unique,
  username text not null unique,
  fullName text,
  photoURL text,
  coverURL text,
  bio text,
  location text,
  website text,
  phoneNumber text,
  gender text,
  dob text,
  education text,
  company text,
  linkedin text,
  github text,
  twitter text,
  work text,
  instagram text,
  relationship text,
  country text,
  fullName_lowercase text,
  completedProfile boolean not null default false,
  postsCount integer not null default 0,
  followersCount integer not null default 0,
  followingCount integer not null default 0,
  friendsCount integer not null default 0,
  online boolean not null default false,
  lastSeen timestamptz,
  createdAt timestamptz not null default now(),
  lastLoginAt timestamptz not null default now(),
  providerId text,
  randomKey double precision
);

create table if not exists public.posts (
  id text primary key,
  userId text not null references public.users(uid) on delete cascade,
  username text not null,
  content text not null default '',
  content_lowercase text,
  media jsonb not null default '[]'::jsonb,
  createdAt timestamptz not null default now(),
  userPhotoURL text,
  userFullName text,
  parentPostId text,
  quotePostId text,
  replyCount integer not null default 0,
  quoteCount integer not null default 0,
  linkPreview jsonb not null default '{}'::jsonb,
  viewCount integer not null default 0,
  engagementScore integer not null default 0,
  engagementUpdatedAt timestamptz,
  lastSeen timestamptz
);

create table if not exists public.conversations (
  id text primary key,
  participants text[] not null default '{}'::text[],
  lastMessage text,
  lastMessageAt timestamptz,
  lastMessageSender text,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);

create table if not exists public.messages (
  id text primary key,
  conversationId text not null references public.conversations(id) on delete cascade,
  senderId text not null references public.users(uid) on delete cascade,
  text text not null default '',
  media jsonb not null default '{}'::jsonb,
  createdAt timestamptz not null default now(),
  reactions jsonb not null default '{}'::jsonb,
  hiddenFor text[] not null default '{}'::text[],
  replyTo jsonb,
  isPinned boolean not null default false
);

create table if not exists public.notifications (
  id text primary key,
  actorUid text not null references public.users(uid) on delete cascade,
  recipientUid text not null references public.users(uid) on delete cascade,
  postId text,
  quotePostId text,
  type text not null,
  read boolean not null default false,
  createdAt timestamptz not null default now(),
  extra jsonb not null default '{}'::jsonb,
  url text,
  message text
);

create table if not exists public.user_relationships (
  id text primary key,
  ownerUid text not null references public.users(uid) on delete cascade,
  targetUid text references public.users(uid) on delete cascade,
  kind text not null,
  since timestamptz,
  followedAt timestamptz,
  initiatedBy text,
  payload jsonb not null default '{}'::jsonb,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);

create table if not exists public.post_engagements (
  id text primary key,
  postId text not null references public.posts(id) on delete cascade,
  userId text not null references public.users(uid) on delete cascade,
  liked boolean not null default false,
  disliked boolean not null default false,
  viewed boolean not null default false,
  quoted boolean not null default false,
  replied boolean not null default false,
  lastEngagedAt timestamptz,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);

create table if not exists public.user_meta (
  id text primary key,
  uid text not null references public.users(uid) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  unique (uid, key)
);

create index if not exists users_username_idx on public.users (username);
create index if not exists users_fullName_lowercase_idx on public.users (fullName_lowercase);
create index if not exists posts_userId_createdAt_idx on public.posts (userId, createdAt desc);
create index if not exists posts_parentPostId_idx on public.posts (parentPostId);
create index if not exists posts_quotePostId_idx on public.posts (quotePostId);
create index if not exists conversations_participants_idx on public.conversations using gin (participants);
create index if not exists messages_conversationId_createdAt_idx on public.messages (conversationId, createdAt desc);
create index if not exists notifications_recipientUid_createdAt_idx on public.notifications (recipientUid, createdAt desc);
create index if not exists notifications_actorUid_idx on public.notifications (actorUid);
create index if not exists user_relationships_ownerUid_kind_idx on public.user_relationships (ownerUid, kind);
create index if not exists user_relationships_targetUid_kind_idx on public.user_relationships (targetUid, kind);
create index if not exists post_engagements_postId_userId_idx on public.post_engagements (postId, userId);
create index if not exists user_meta_uid_key_idx on public.user_meta (uid, key);

alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.user_relationships enable row level security;
alter table public.post_engagements enable row level security;
alter table public.user_meta enable row level security;

grant select on public.users to anon, authenticated;
grant insert, update, delete on public.users to authenticated;

grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;

grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.user_relationships to authenticated;
grant select, insert, update, delete on public.post_engagements to authenticated;
grant select, insert, update, delete on public.user_meta to authenticated;

drop policy if exists "users_read_all" on public.users;
create policy "users_read_all"
on public.users
for select
to anon, authenticated
using (true);

drop policy if exists "users_manage_own_profile" on public.users;
create policy "users_manage_own_profile"
on public.users
for insert
to authenticated
with check (auth.uid()::text = uid);

drop policy if exists "users_update_own_profile" on public.users;
create policy "users_update_own_profile"
on public.users
for update
to authenticated
using (auth.uid()::text = uid)
with check (auth.uid()::text = uid);

drop policy if exists "users_delete_own_profile" on public.users;
create policy "users_delete_own_profile"
on public.users
for delete
to authenticated
using (auth.uid()::text = uid);

drop policy if exists "posts_read_all" on public.posts;
create policy "posts_read_all"
on public.posts
for select
to anon, authenticated
using (true);

drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own"
on public.posts
for insert
to authenticated
with check (auth.uid()::text = userId);

drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own"
on public.posts
for update
to authenticated
using (auth.uid()::text = userId)
with check (auth.uid()::text = userId);

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own"
on public.posts
for delete
to authenticated
using (auth.uid()::text = userId);

drop policy if exists "conversations_participant_access" on public.conversations;
create policy "conversations_participant_access"
on public.conversations
for select
to authenticated
using (auth.uid()::text = any(participants));

drop policy if exists "conversations_participant_insert" on public.conversations;
create policy "conversations_participant_insert"
on public.conversations
for insert
to authenticated
with check (auth.uid()::text = any(participants));

drop policy if exists "conversations_participant_update" on public.conversations;
create policy "conversations_participant_update"
on public.conversations
for update
to authenticated
using (auth.uid()::text = any(participants))
with check (auth.uid()::text = any(participants));

drop policy if exists "conversations_participant_delete" on public.conversations;
create policy "conversations_participant_delete"
on public.conversations
for delete
to authenticated
using (auth.uid()::text = any(participants));

drop policy if exists "messages_participant_access" on public.messages;
create policy "messages_participant_access"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversationId
      and auth.uid()::text = any(c.participants)
  )
);

drop policy if exists "messages_participant_insert" on public.messages;
create policy "messages_participant_insert"
on public.messages
for insert
to authenticated
with check (
  auth.uid()::text = senderId
  and exists (
    select 1
    from public.conversations c
    where c.id = conversationId
      and auth.uid()::text = any(c.participants)
  )
);

drop policy if exists "messages_participant_update" on public.messages;
create policy "messages_participant_update"
on public.messages
for update
to authenticated
using (
  auth.uid()::text = senderId
  or exists (
    select 1
    from public.conversations c
    where c.id = conversationId
      and auth.uid()::text = any(c.participants)
  )
)
with check (
  auth.uid()::text = senderId
  or exists (
    select 1
    from public.conversations c
    where c.id = conversationId
      and auth.uid()::text = any(c.participants)
  )
);

drop policy if exists "messages_participant_delete" on public.messages;
create policy "messages_participant_delete"
on public.messages
for delete
to authenticated
using (
  auth.uid()::text = senderId
  or exists (
    select 1
    from public.conversations c
    where c.id = conversationId
      and auth.uid()::text = any(c.participants)
  )
);

drop policy if exists "notifications_owner_only" on public.notifications;
create policy "notifications_owner_only"
on public.notifications
for select
to authenticated
using (auth.uid()::text = recipientUid);

drop policy if exists "notifications_insert_sender" on public.notifications;
create policy "notifications_insert_sender"
on public.notifications
for insert
to authenticated
with check (auth.uid()::text = actorUid);

drop policy if exists "notifications_update_owner" on public.notifications;
create policy "notifications_update_owner"
on public.notifications
for update
to authenticated
using (auth.uid()::text = recipientUid)
with check (auth.uid()::text = recipientUid);

drop policy if exists "notifications_delete_owner" on public.notifications;
create policy "notifications_delete_owner"
on public.notifications
for delete
to authenticated
using (auth.uid()::text = recipientUid);

drop policy if exists "relationships_read_all" on public.user_relationships;
create policy "relationships_read_all"
on public.user_relationships
for select
to anon, authenticated
using (true);

drop policy if exists "relationships_insert_own" on public.user_relationships;
create policy "relationships_insert_own"
on public.user_relationships
for insert
to authenticated
with check (
  auth.uid()::text = ownerUid
  or auth.uid()::text = targetUid
);

drop policy if exists "relationships_update_own" on public.user_relationships;
create policy "relationships_update_own"
on public.user_relationships
for update
to authenticated
using (
  auth.uid()::text = ownerUid
  or auth.uid()::text = targetUid
)
with check (
  auth.uid()::text = ownerUid
  or auth.uid()::text = targetUid
);

drop policy if exists "relationships_delete_own" on public.user_relationships;
create policy "relationships_delete_own"
on public.user_relationships
for delete
to authenticated
using (
  auth.uid()::text = ownerUid
  or auth.uid()::text = targetUid
);

drop policy if exists "post_engagements_read_all" on public.post_engagements;
create policy "post_engagements_read_all"
on public.post_engagements
for select
to anon, authenticated
using (true);

drop policy if exists "post_engagements_insert_own" on public.post_engagements;
create policy "post_engagements_insert_own"
on public.post_engagements
for insert
to authenticated
with check (auth.uid()::text = userId);

drop policy if exists "post_engagements_update_own" on public.post_engagements;
create policy "post_engagements_update_own"
on public.post_engagements
for update
to authenticated
using (auth.uid()::text = userId)
with check (auth.uid()::text = userId);

drop policy if exists "post_engagements_delete_own" on public.post_engagements;
create policy "post_engagements_delete_own"
on public.post_engagements
for delete
to authenticated
using (auth.uid()::text = userId);

drop policy if exists "user_meta_own_only" on public.user_meta;
create policy "user_meta_own_only"
on public.user_meta
for select
to authenticated
using (auth.uid()::text = uid);

drop policy if exists "user_meta_insert_own" on public.user_meta;
create policy "user_meta_insert_own"
on public.user_meta
for insert
to authenticated
with check (auth.uid()::text = uid);

drop policy if exists "user_meta_update_own" on public.user_meta;
create policy "user_meta_update_own"
on public.user_meta
for update
to authenticated
using (auth.uid()::text = uid)
with check (auth.uid()::text = uid);

drop policy if exists "user_meta_delete_own" on public.user_meta;
create policy "user_meta_delete_own"
on public.user_meta
for delete
to authenticated
using (auth.uid()::text = uid);
