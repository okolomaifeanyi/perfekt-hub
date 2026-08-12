export interface FetchUnreadNotificationCountOptions {
  fetchImpl?: typeof fetch;
  accessToken?: string;
}

export function fetchUnreadNotificationCount(
  options?: FetchUnreadNotificationCountOptions
): Promise<number>;
