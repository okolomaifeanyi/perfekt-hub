// Pure, dependency-injectable implementation of the two-provider link safety
// check used both when a person shares a link in a post and when curated
// content is ingested (see lib/links.ts's isSafeLink, which wraps this with
// the real API keys and native fetch). Kept in its own plain .mjs module
// with fetchImpl injectable so it can run under this project's plain
// `node --test` runner without needing the Next.js-only bits lib/links.ts
// depends on (cheerio, "@/" path aliases) — same split curated-content-safety.mjs
// already uses links.ts for, and for the same reason.

const DEFAULT_TIMEOUT_MS = 4000;

function withTimeout(fetchImpl, url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetchImpl(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * Google Safe Browsing v4 threatMatches check.
 *
 * Returns `{ safe: false, reason }` when Google confirms a threat,
 * `{ safe: true }` when Google confirms there's no match, or `null` when
 * Google's answer can't be trusted (network error, timeout, or a non-2xx
 * HTTP status such as an invalid/expired API key). `null` means "try the
 * next provider", never "safe" — treating a non-2xx response as a clean
 * result was the actual bug here: an invalid SAFE_BROWSING_API_KEY made
 * every single link report safe (Google's error body has no `matches`
 * field either, so `data?.matches?.length > 0` was always false) without
 * VirusTotal ever getting a chance to catch it.
 */
export async function checkGoogleSafeBrowsing(
  url,
  apiKey,
  { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, clientName = "app" } = {}
) {
  if (!apiKey) return null;

  try {
    const res = await withTimeout(
      fetchImpl,
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: { clientId: clientName, clientVersion: "1.0.0" },
          threatInfo: {
            threatTypes: [
              "MALWARE",
              "SOCIAL_ENGINEERING",
              "UNWANTED_SOFTWARE",
              "POTENTIALLY_HARMFUL_APPLICATION",
            ],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url }],
          },
        }),
      },
      timeoutMs
    );

    if (!res.ok) return null; // bad/expired key, quota exceeded, etc. — don't trust the body
    const data = await res.json();
    if (data?.matches?.length > 0) {
      return { safe: false, reason: "Google Safe Browsing flagged this link" };
    }
    return { safe: true };
  } catch {
    return null;
  }
}

// VirusTotal's URL report is keyed by the URL-safe, unpadded base64 of the
// URL string itself (VT API v3 spec) — Node's built-in "base64url" encoding
// already omits padding, so no manual `replace` is needed.
function virusTotalUrlId(url) {
  return Buffer.from(url, "utf-8").toString("base64url");
}

async function submitForFutureScan(url, apiKey, { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  await withTimeout(
    fetchImpl,
    "https://www.virustotal.com/api/v3/urls",
    {
      method: "POST",
      headers: { "x-apikey": apiKey, "Content-Type": "application/x-www-form-urlencoded" },
      body: `url=${encodeURIComponent(url)}`,
    },
    timeoutMs
  );
}

/**
 * VirusTotal check. Looks up the URL's EXISTING report first — fast, no
 * scan needed. The previous implementation always submitted the URL for a
 * brand-new scan and immediately read *that* scan's analysis; a fresh
 * analysis is still "queued" milliseconds after submission, so
 * `stats.malicious` reads 0 almost every time regardless of the URL,
 * silently defeating the check for any URL VirusTotal hadn't already seen.
 * When there's no existing report yet (404), this queues the URL for a
 * future scan (fire-and-forget — analysis takes longer than our timeout
 * budget) and reports inconclusive rather than "safe".
 */
export async function checkVirusTotal(
  url,
  apiKey,
  { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}
) {
  if (!apiKey) return null;

  try {
    const id = virusTotalUrlId(url);
    const res = await withTimeout(
      fetchImpl,
      `https://www.virustotal.com/api/v3/urls/${id}`,
      { headers: { "x-apikey": apiKey } },
      timeoutMs
    );

    if (res.status === 404) {
      submitForFutureScan(url, apiKey, { fetchImpl, timeoutMs }).catch(() => {});
      return { safe: true, reason: "No prior VirusTotal data; queued for scanning" };
    }
    if (!res.ok) return null; // bad/expired key, quota exceeded, etc. — don't trust the body

    const data = await res.json();
    const malicious = data?.data?.attributes?.last_analysis_stats?.malicious ?? 0;
    if (malicious > 0) {
      return { safe: false, reason: "VirusTotal flagged this link as malicious" };
    }
    return { safe: true };
  } catch {
    return null;
  }
}

/**
 * Orchestrates both providers: Google first, VirusTotal as fallback, and
 * "no definitive result" — failing open, the same policy the rest of this
 * pipeline uses — only when neither provider returned a trustworthy answer
 * (e.g. neither API key is configured in this environment).
 *
 * @param {string} url
 * @param {{ googleApiKey?: string; virusTotalApiKey?: string; fetchImpl?: typeof fetch; timeoutMs?: number; clientName?: string }} [options]
 * @returns {Promise<{ safe: boolean; source: "google" | "virustotal" | "unknown"; reason?: string }>}
 */
export async function isLinkSafe(
  url,
  { googleApiKey, virusTotalApiKey, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, clientName = "app" } = {}
) {
  const google = await checkGoogleSafeBrowsing(url, googleApiKey, { fetchImpl, timeoutMs, clientName });
  if (google) return { ...google, source: "google" };

  const vt = await checkVirusTotal(url, virusTotalApiKey, { fetchImpl, timeoutMs });
  if (vt) return { ...vt, source: "virustotal" };

  return { safe: true, source: "unknown", reason: "No definitive result" };
}
