// lib/links.ts pulls in Next.js's "@/" path aliases (and cheerio/firestore),
// which only resolve inside the Next.js runtime — not under this project's
// plain `node --test`. Importing it dynamically, only once actually needed
// (a real source_url that isn't already blocklisted), keeps every other
// path in this module — and every test that doesn't exercise it — free of
// that dependency.
let isSafeLinkPromise;
function getIsSafeLink() {
  isSafeLinkPromise ??= import("./links.ts").then(mod => mod.isSafeLink);
  return isSafeLinkPromise;
}

// Hand-maintained fallback for domains reported as dangerous (e.g. flagged
// by a visitor's antivirus) — checked first, synchronously, with no network
// call, so a known-bad domain is rejected instantly and even in
// environments where SAFE_BROWSING_API_KEY/VIRUSTOTAL_API_KEY aren't
// configured (isSafeLink fails open to "safe" when neither is set). Extend
// this set as new bad domains get reported.
const BLOCKED_DOMAINS = new Set(["summitpostnews.com"]);

function hostnameOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isBlockedDomain(url) {
  const hostname = hostnameOf(url);
  if (!hostname) return false;
  for (const blocked of BLOCKED_DOMAINS) {
    if (hostname === blocked || hostname.endsWith(`.${blocked}`)) return true;
  }
  return false;
}

/**
 * Cheap, synchronous defense-in-depth for content already sitting in the
 * table (e.g. ingested before a domain was added to the blocklist) — every
 * curated_content read goes through this so a bad row disappears from the
 * app immediately, without waiting on a backfill or the next cron run.
 * @template {{ source_url?: string | null }} T
 * @param {T[]} items
 * @returns {T[]}
 */
export function filterBlockedDomains(items) {
  return items.filter(item => !isBlockedDomain(item.source_url));
}

// Same verification posts run on every link a person shares (see isSafeLink
// in lib/links.ts — Google Safe Browsing, with a VirusTotal fallback) reused
// here so newly-ingested articles get the identical check before they're
// ever stored, not just the local blocklist. A small concurrency cap keeps a
// batch of dozens of new articles from firing that many requests at once
// against either provider's rate limit; isSafeLink itself already fails
// open (assumes safe) when neither API key is configured or a check errors,
// so one flaky lookup can't take down an entire ingestion run.
const SAFETY_CHECK_CONCURRENCY = 5;

export async function filterUnsafeCuratedContent(items) {
  const safeItems = [];
  const rejected = [];
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor++];
      if (!item.source_url) {
        safeItems.push(item);
        continue;
      }
      if (isBlockedDomain(item.source_url)) {
        rejected.push({ url: item.source_url, reason: "blocked domain" });
        continue;
      }
      try {
        const isSafeLink = await getIsSafeLink();
        const result = await isSafeLink(item.source_url);
        if (result.safe) {
          safeItems.push(item);
        } else {
          rejected.push({ url: item.source_url, reason: result.reason || "unsafe" });
        }
      } catch {
        safeItems.push(item);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(SAFETY_CHECK_CONCURRENCY, items.length) }, worker)
  );

  return { safeItems, rejected };
}
