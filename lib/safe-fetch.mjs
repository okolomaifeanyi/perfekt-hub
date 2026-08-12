const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_TIMEOUT_MS = 5000;

export class BlockedUrlError extends Error {}
export class TooManyRedirectsError extends Error {}

/**
 * Fetches a URL while re-validating every redirect hop against isPublicUrl.
 * A plain `fetch(url, { redirect: "follow" })` only validates the URL the
 * caller supplied — a public URL can still 302 to an internal address (e.g.
 * the cloud metadata endpoint) and the runtime follows it transparently,
 * turning a passed SSRF check into a bypass. Re-checking each hop closes
 * that gap.
 */
export async function fetchFollowingValidatedRedirects(
  startUrl,
  {
    isPublicUrl,
    fetchImpl = fetch,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    init = {},
  }
) {
  let currentUrl = startUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (!(await isPublicUrl(currentUrl))) {
      throw new BlockedUrlError(`Blocked non-public URL: ${currentUrl}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetchImpl(currentUrl, {
        ...init,
        redirect: "manual",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        throw new Error("Redirect response missing Location header");
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return res;
  }

  throw new TooManyRedirectsError(
    `Exceeded ${maxRedirects} redirects fetching ${startUrl}`
  );
}
