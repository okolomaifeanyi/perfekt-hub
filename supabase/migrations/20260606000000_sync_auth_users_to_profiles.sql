create schema if not exists app_private;

create or replace function app_private.slugify_username(base_name text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(
      both '-' from regexp_replace(
        regexp_replace(
          lower(trim(coalesce(base_name, 'user'))),
          '[^a-z0-9[:space:]-]',
          '',
          'g'
        ),
        '[[:space:]]+',
        '-',
        'g'
      )
    ),
    ''
  );
$$;

create or replace function app_private.generate_unique_username(base_name text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  base_username text := coalesce(app_private.slugify_username(base_name), 'user');
  candidate text := base_username;
  suffix integer := 1;
begin
  loop
    exit when not exists (
      select 1
      from public.users
      where username = candidate
    );

    candidate := base_username || '-' || suffix;
    suffix := suffix + 1;
  end loop;

  return candidate;
end;
$$;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  base_name text := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(trim(new.raw_user_meta_data->>'fullName'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(coalesce(new.email, new.id::text), '@', 1)
  );
  full_name_value text := coalesce(
    nullif(trim(new.raw_user_meta_data->>'fullName'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(coalesce(new.email, new.id::text), '@', 1)
  );
  username_value text := app_private.generate_unique_username(base_name);
begin
  insert into public.users (
    uid,
    email,
    username,
    fullname,
    photourl,
    completedprofile,
    postscount,
    followerscount,
    followingcount,
    friendscount,
    providerid,
    createdat,
    lastloginat,
    fullname_lowercase,
    randomkey
  )
  values (
    new.id::text,
    new.email,
    username_value,
    full_name_value,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
      nullif(trim(new.raw_user_meta_data->>'picture'), ''),
      nullif(trim(new.raw_user_meta_data->>'photoURL'), '')
    ),
    false,
    0,
    0,
    0,
    0,
    coalesce(new.raw_app_meta_data->>'provider', 'supabase'),
    coalesce(new.created_at, now()),
    coalesce(new.created_at, now()),
    lower(full_name_value),
    random()
  )
  on conflict (uid) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function app_private.handle_new_user();

do $$
declare
  auth_user record;
  base_name text;
  full_name_value text;
begin
  for auth_user in
    select
      au.id,
      au.email,
      au.created_at,
      au.raw_user_meta_data,
      au.raw_app_meta_data
    from auth.users au
    left join public.users existing_user
      on existing_user.uid = au.id::text
    where existing_user.uid is null
    order by au.created_at asc
  loop
    base_name := coalesce(
      nullif(trim(auth_user.raw_user_meta_data->>'username'), ''),
      nullif(trim(auth_user.raw_user_meta_data->>'fullName'), ''),
      nullif(trim(auth_user.raw_user_meta_data->>'name'), ''),
      split_part(coalesce(auth_user.email, auth_user.id::text), '@', 1)
    );
    full_name_value := coalesce(
      nullif(trim(auth_user.raw_user_meta_data->>'fullName'), ''),
      nullif(trim(auth_user.raw_user_meta_data->>'name'), ''),
      split_part(coalesce(auth_user.email, auth_user.id::text), '@', 1)
    );

  insert into public.users (
      uid,
      email,
      username,
      fullname,
      photourl,
      completedprofile,
      postscount,
      followerscount,
      followingcount,
      friendscount,
      providerid,
      createdat,
      lastloginat,
      fullname_lowercase,
      randomkey
    )
    values (
      auth_user.id::text,
      auth_user.email,
      app_private.generate_unique_username(base_name),
      full_name_value,
      coalesce(
        nullif(trim(auth_user.raw_user_meta_data->>'avatar_url'), ''),
        nullif(trim(auth_user.raw_user_meta_data->>'picture'), ''),
        nullif(trim(auth_user.raw_user_meta_data->>'photoURL'), '')
      ),
      false,
      0,
      0,
      0,
      0,
      coalesce(auth_user.raw_app_meta_data->>'provider', 'supabase'),
      coalesce(auth_user.created_at, now()),
      coalesce(auth_user.created_at, now()),
      lower(full_name_value),
      random()
    )
    on conflict (uid) do nothing;
  end loop;
end;
$$;
