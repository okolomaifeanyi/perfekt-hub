create or replace function public.generate_unique_username(base_name text)
returns text
language sql
stable
security definer
set search_path = public, app_private
as $$
  select app_private.generate_unique_username(base_name);
$$;

create or replace function public.lookup_user_email_by_username(input_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email
  from public.users
  where lower(username) = lower(trim(coalesce(input_username, '')))
  limit 1;
$$;

create or replace function public.get_user_profile_by_uid(target_uid text)
returns public.users
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.users
  where uid = target_uid
  limit 1;
$$;

create or replace function public.sync_user_profile(profile jsonb)
returns public.users
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  caller_uid text := auth.uid()::text;
  resolved_uid text := nullif(trim(coalesce(profile->>'uid', caller_uid)), '');
  resolved_email text := nullif(trim(profile->>'email'), '');
  profile_username text := nullif(trim(coalesce(profile->>'username', profile->>'userName')), '');
  profile_full_name text := coalesce(
    nullif(trim(profile->>'fullname'), ''),
    nullif(trim(profile->>'fullName'), ''),
    nullif(trim(profile->>'name'), ''),
    split_part(coalesce(resolved_email, resolved_uid), '@', 1)
  );
  profile_photo_url text := coalesce(
    nullif(trim(profile->>'photourl'), ''),
    nullif(trim(profile->>'photoURL'), ''),
    nullif(trim(profile->>'photoUrl'), ''),
    nullif(trim(profile->>'avatar_url'), ''),
    nullif(trim(profile->>'picture'), '')
  );
  profile_provider_id text := coalesce(
    nullif(trim(profile->>'providerid'), ''),
    nullif(trim(profile->>'providerId'), ''),
    nullif(trim(profile->>'provider'), ''),
    'supabase'
  );
  profile_completed boolean := coalesce(nullif(trim(profile->>'completedprofile'), '')::boolean, false);
  profile_created_at timestamptz := coalesce(nullif(trim(profile->>'createdat'), '')::timestamptz, now());
  profile_last_login_at timestamptz := coalesce(nullif(trim(profile->>'lastloginat'), '')::timestamptz, now());
  profile_random_key double precision := coalesce(nullif(trim(profile->>'randomkey'), '')::double precision, random());
  upserted_profile public.users;
  base_name text := coalesce(
    profile_username,
    profile_full_name,
    split_part(coalesce(resolved_email, resolved_uid), '@', 1),
    'user'
  );
begin
  if caller_uid is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if resolved_uid is null then
    raise exception 'Missing uid' using errcode = '42501';
  end if;

  if caller_uid <> resolved_uid then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

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
    resolved_uid,
    resolved_email,
    coalesce(profile_username, app_private.generate_unique_username(base_name)),
    profile_full_name,
    profile_photo_url,
    profile_completed,
    coalesce(nullif(trim(profile->>'postscount'), '')::integer, 0),
    coalesce(nullif(trim(profile->>'followerscount'), '')::integer, 0),
    coalesce(nullif(trim(profile->>'followingcount'), '')::integer, 0),
    coalesce(nullif(trim(profile->>'friendscount'), '')::integer, 0),
    profile_provider_id,
    profile_created_at,
    profile_last_login_at,
    lower(profile_full_name),
    profile_random_key
  )
  on conflict (uid) do update set
    email = coalesce(nullif(excluded.email, ''), public.users.email),
    username = coalesce(nullif(public.users.username, ''), excluded.username),
    fullname = coalesce(nullif(public.users.fullname, ''), excluded.fullname),
    photourl = coalesce(nullif(public.users.photourl, ''), excluded.photourl),
    completedprofile = public.users.completedprofile or excluded.completedprofile,
    providerid = coalesce(nullif(public.users.providerid, ''), excluded.providerid),
    lastloginat = greatest(coalesce(public.users.lastloginat, excluded.lastloginat), excluded.lastloginat),
    fullname_lowercase = coalesce(nullif(public.users.fullname_lowercase, ''), excluded.fullname_lowercase)
  returning * into upserted_profile;

  return upserted_profile;
end;
$$;

grant execute on function public.generate_unique_username(text) to anon, authenticated;
grant execute on function public.lookup_user_email_by_username(text) to anon, authenticated;
grant execute on function public.get_user_profile_by_uid(text) to authenticated;
grant execute on function public.sync_user_profile(jsonb) to authenticated;
