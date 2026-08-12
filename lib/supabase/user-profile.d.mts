export type SupabaseUserRow = Record<string, unknown>;

export type SupabaseUserRowInput = {
  uid: string;
  email?: string | null;
  username: string;
  fullName?: string | null;
  fullname?: string | null;
  photoURL?: string | null;
  photourl?: string | null;
  coverURL?: string | null;
  coverurl?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  phoneNumber?: string | null;
  phonenumber?: string | null;
  gender?: string | null;
  dob?: string | null;
  education?: string | null;
  company?: string | null;
  linkedin?: string | null;
  github?: string | null;
  twitter?: string | null;
  work?: string | null;
  instagram?: string | null;
  relationship?: string | null;
  country?: string | null;
  fullName_lowercase?: string | null;
  fullname_lowercase?: string | null;
  completedProfile?: boolean | null;
  completedprofile?: boolean | null;
  postsCount?: number | null;
  postscount?: number | null;
  followersCount?: number | null;
  followerscount?: number | null;
  followingCount?: number | null;
  followingcount?: number | null;
  friendsCount?: number | null;
  friendscount?: number | null;
  online?: boolean | null;
  lastSeen?: Date | string | null;
  lastseen?: Date | string | null;
  createdAt?: Date | string | null;
  createdat?: Date | string | null;
  lastLoginAt?: Date | string | null;
  lastloginat?: Date | string | null;
  providerId?: string | null;
  providerid?: string | null;
  randomKey?: number | null;
  randomkey?: number | null;
};

export declare function toSupabaseUserRow(
  profile: SupabaseUserRowInput
): Record<string, unknown>;

export declare function fromSupabaseUserRow(
  row: SupabaseUserRow
): import("../types").UserProps;
