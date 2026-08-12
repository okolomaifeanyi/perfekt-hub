import * as cheerio from "cheerio";
import { firestoreAdmin } from "@/lib/supabase";
import { appInfo } from "./appInfo";
import { decode } from "html-entities";
import { LinkPreviewType } from "./types";
import { extractLinks, normalizeUrl } from "./link-parser.mjs";
import { isPublicHttpUrl } from "./ssrf-guard.mjs";
import { fetchFollowingValidatedRedirects } from "./safe-fetch.mjs";
import { getSsrfSafeDispatcher } from "./ssrf-dispatcher.mjs";

export { extractLinks, normalizeUrl };

const APP_DOMAIN = appInfo.url;

function cleanText(str?: string) {
  return str ? decode(str).replace(/\s+/g, " ").trim() : "";
}

// Known sites that block scraping â†’ prefer LinkPreview directly
const LINK_PREVIEW_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
];

const SAFETY_CHECK_TIMEOUT_MS = 4000;

// Both providers are non-critical (posting must not hang or fail because a
// third-party safety check is slow or unreachable), so every request gets a
// short timeout and any failure falls through to the next check.
function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SAFETY_CHECK_TIMEOUT_MS);

  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timeout)
  );
}

export async function isSafeLink(url: string): Promise<{
  safe: boolean;
  source: "google" | "virustotal" | "unknown";
  reason?: string;
}> {
  try {
    // 1. Google Safe Browsing API check
    const googleRes = await fetchWithTimeout(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.SAFE_BROWSING_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: {
            clientId: appInfo.name,
            clientVersion: "1.0.0",
          },
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
      }
    );

    const googleData = await googleRes.json();
    if (googleData?.matches?.length > 0) {
      return {
        safe: false,
        source: "google",
        reason: "Google flagged as unsafe",
      };
    }

    return { safe: true, source: "google" };
  } catch (err) {
    console.error("Google Safe Browsing failed, falling back:", err);
  }

  // 2. VirusTotal fallback
  try {
    const vtRes = await fetchWithTimeout(`https://www.virustotal.com/api/v3/urls`, {
      method: "POST",
      headers: {
        "x-apikey": process.env.VIRUSTOTAL_API_KEY!,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `url=${encodeURIComponent(url)}`,
    });

    const vtData = await vtRes.json();
    if (vtData?.data?.id) {
      // fetch full analysis
      const analysisRes = await fetchWithTimeout(
        `https://www.virustotal.com/api/v3/analyses/${vtData.data.id}`,
        {
          headers: { "x-apikey": process.env.VIRUSTOTAL_API_KEY! },
        }
      );
      const analysisData = await analysisRes.json();

      const malicious = analysisData?.data?.attributes?.stats?.malicious || 0;
      if (malicious > 0) {
        return {
          safe: false,
          source: "virustotal",
          reason: "VirusTotal flagged as malicious",
        };
      }
      return { safe: true, source: "virustotal" };
    }
  } catch (err) {
    console.error("VirusTotal check failed:", err);
  }

  return { safe: true, source: "unknown", reason: "No definitive result" };
}

async function fetchWithLinkPreview(url: string) {
  const res = await fetchWithTimeout(
    `https://api.linkpreview.net/?key=${
      process.env.LINK_PREVIEW_API_KEY
    }&q=${encodeURIComponent(url)}`
  );
  if (!res.ok) throw new Error("LinkPreview API error");
  const data = await res.json();

  return {
    url,
    title: data.title || "",
    description: data.description || "",
    image: data.image || "",
  };
}


export async function fetchMetadata(rawUrl: string): Promise<LinkPreviewType | null> {
  try {
    const normalized = normalizeUrl(rawUrl);
    const { hostname } = new URL(normalized);

    // Refuse to let the server fetch internal/private network targets on a
    // caller's behalf (SSRF).
    if (!(await isPublicHttpUrl(normalized))) {
      return null;
    }

    // If blocked domain â†’ go straight to LinkPreview
    if (LINK_PREVIEW_DOMAINS.some(d => hostname.endsWith(d))) {
      return await fetchWithLinkPreview(normalized);
    }

    const res = await fetchFollowingValidatedRedirects(normalized, {
      isPublicUrl: isPublicHttpUrl,
      init: { dispatcher: getSsrfSafeDispatcher() as never },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${normalized}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Prefer OG tags
    let title = cleanText($('meta[property="og:title"]').attr("content"));
    let description = cleanText(
      $('meta[property="og:description"]').attr("content") ||
        $('meta[name="description"]').attr("content")
    );
    let image = cleanText($('meta[property="og:image"]').attr("content"));

    // Twitter card fallback
    if (!title) {
      title =
        cleanText($('meta[name="twitter:title"]').attr("content")) || title;
    }
    if (!description) {
      description =
        cleanText($('meta[name="twitter:description"]').attr("content")) ||
        description;
    }
    if (!image) {
      image =
        cleanText($('meta[name="twitter:image"]').attr("content")) || image;
    }

    // Extra fallback for <meta name="title">
    if (!title) {
      title =
        cleanText($('meta[name="title"]').attr("content")) ||
        cleanText($("title").text());
    }

    // Retry with www if missing image
    if (!image && !normalized.includes("://www.")) {
      const wwwUrl = normalized.replace("://", "://www.");
      try {
        const res2 = await fetchFollowingValidatedRedirects(wwwUrl, {
          isPublicUrl: isPublicHttpUrl,
          init: { dispatcher: getSsrfSafeDispatcher() as never },
        });
        if (res2.ok) {
          const html2 = await res2.text();
          const $$ = cheerio.load(html2);
          image =
            cleanText($$('meta[property="og:image"]').attr("content")) ||
            cleanText($$('meta[name="twitter:image"]').attr("content")) ||
            "";
        }
      } catch {
        // ignore www retry error
      }
    }

    // Fallback: LinkPreview API (if weak data)
    if ((!title && !description) || !image) {
      try {
        const lp = await fetchWithLinkPreview(normalized);
        title ||= lp.title;
        description ||= lp.description;
        image ||= lp.image;
      } catch (e) {
        console.error("LinkPreview API failed:", e);
      }
    }

    // Fallback: Clearbit logo
    if (!image) {
      image = `https://logo.clearbit.com/${hostname}`;
    }

    // Final fallback: Google favicon
    if (!image) {
      image = `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`;
    }

    if (!title && !description && !image) {
      return null;
    }

    return { url: normalized, title, description, image };
  } catch (err) {
    console.error("Metadata fetch failed:", err);
    return null;
  }
}

/** If link points to your own domain, resolve as post */
export async function resolveNativePost(rawUrl: string) {
  try {
    const normalized = normalizeUrl(rawUrl);
    const u = new URL(normalized);

    // Extract just the host from APP_DOMAIN
    const appHost = new URL(APP_DOMAIN).hostname;

    // Strict domain check (prevent evil.com/perfekthub.com.evil)
    if (u.hostname === appHost || u.hostname.endsWith("." + appHost)) {
      const pathParts = u.pathname.split("/").filter(Boolean);
      const postId = pathParts.at(-1); // cleaner way
      if (!postId) return null;

      const snap = await firestoreAdmin.collection("posts").doc(postId).get();
      if (snap.exists()) {
        return { ...snap.data(), id: snap.id };
      }
    }
  } catch (err) {
    console.error("Native post resolution failed:", err);
  }
  return null;
}
