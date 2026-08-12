export declare function generateUniqueUsername(
  supabase: unknown,
  baseName: string
): Promise<string>;

export declare function lookupEmailByUsername(
  supabase: unknown,
  username: string
): Promise<string | null>;

export declare function getUserProfileByUid(
  supabase: unknown,
  uid: string
): Promise<import("../types").UserProps | null>;

export declare function syncUserProfileViaRpc(
  supabase: unknown,
  profile: Record<string, unknown>
): Promise<import("../types").UserProps>;
