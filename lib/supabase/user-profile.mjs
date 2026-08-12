function toDateValue(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date(value);
}

function toNumberValue(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toStringValue(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;

    const text = String(value).trim();
    if (text) return text;
  }

  return undefined;
}

function stripUndefined(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, child]) => child !== undefined)
  );
}

export function toSupabaseUserRow(profile) {
  return stripUndefined({
    uid: profile.uid,
    email: profile.email ?? undefined,
    username: profile.username,
    fullname: profile.fullName ?? profile.fullname,
    photourl: profile.photoURL ?? profile.photourl,
    coverurl: profile.coverURL ?? profile.coverurl,
    bio: profile.bio,
    location: profile.location,
    website: profile.website,
    phonenumber: profile.phoneNumber ?? profile.phonenumber,
    gender: profile.gender,
    dob: profile.dob,
    education: profile.education,
    company: profile.company,
    linkedin: profile.linkedin,
    github: profile.github,
    twitter: profile.twitter,
    work: profile.work,
    instagram: profile.instagram,
    relationship: profile.relationship,
    country: profile.country,
    fullname_lowercase:
      profile.fullName_lowercase ??
      profile.fullname_lowercase ??
      String(profile.fullName ?? profile.username ?? "").trim().toLowerCase(),
    completedprofile: profile.completedProfile ?? profile.completedprofile,
    postscount: profile.postsCount ?? profile.postscount,
    followerscount: profile.followersCount ?? profile.followerscount,
    followingcount: profile.followingCount ?? profile.followingcount,
    friendscount: profile.friendsCount ?? profile.friendscount,
    online: profile.online,
    lastseen: toDateValue(profile.lastSeen ?? profile.lastseen),
    createdat: toDateValue(profile.createdAt ?? profile.createdat) ?? new Date(),
    lastloginat:
      toDateValue(profile.lastLoginAt ?? profile.lastloginat) ?? new Date(),
    providerid: profile.providerId ?? profile.providerid ?? "supabase",
    randomkey: profile.randomKey ?? profile.randomkey ?? Math.random(),
  });
}

export function fromSupabaseUserRow(row) {
  const fullName = toStringValue(row.fullname, row.fullName);
  const username = toStringValue(row.username) ?? "";
  const photoURL = toStringValue(row.photourl, row.photoURL);
  const phoneNumber = toStringValue(row.phonenumber, row.phoneNumber);
  const gender = toStringValue(row.gender);
  const dob = toStringValue(row.dob);
  const completedProfile =
    Boolean(row.completedprofile ?? row.completedProfile) ||
    Boolean(phoneNumber && gender && dob && photoURL);

  return stripUndefined({
    uid: toStringValue(row.uid) ?? "",
    email: toStringValue(row.email),
    username,
    fullName,
    photoURL,
    coverURL: toStringValue(row.coverurl, row.coverURL),
    bio: toStringValue(row.bio),
    location: toStringValue(row.location),
    website: toStringValue(row.website),
    phoneNumber,
    gender,
    dob,
    education: toStringValue(row.education),
    company: toStringValue(row.company),
    linkedin: toStringValue(row.linkedin),
    github: toStringValue(row.github),
    twitter: toStringValue(row.twitter),
    work: toStringValue(row.work),
    instagram: toStringValue(row.instagram),
    relationship: toStringValue(row.relationship),
    country: toStringValue(row.country),
    fullName_lowercase:
      toStringValue(row.fullname_lowercase, row.fullName_lowercase) ??
      String(fullName ?? username).trim().toLowerCase(),
    completedProfile,
    postsCount: toNumberValue(row.postscount ?? row.postsCount) ?? 0,
    followersCount: toNumberValue(row.followerscount ?? row.followersCount) ?? 0,
    followingCount: toNumberValue(row.followingcount ?? row.followingCount) ?? 0,
    friendsCount: toNumberValue(row.friendscount ?? row.friendsCount) ?? 0,
    online:
      typeof row.online === "boolean"
        ? row.online
        : row.online === 1 || row.online === "true"
          ? true
          : row.online === 0 || row.online === "false"
            ? false
            : undefined,
    lastSeen: toDateValue(row.lastseen ?? row.lastSeen) ?? null,
    createdAt: toDateValue(row.createdat ?? row.createdAt) ?? null,
  });
}
