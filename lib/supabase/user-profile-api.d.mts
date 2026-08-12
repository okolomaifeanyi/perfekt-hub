export type SyncUserProfileOptions = {
  uid?: string;
  accessToken?: string;
  fetchImpl?: typeof fetch;
};

export declare function syncUserProfile(
  options?: SyncUserProfileOptions
): Promise<import("../types").UserProps>;
