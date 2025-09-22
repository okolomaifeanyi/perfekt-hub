import * as cheerio from "cheerio";
import { firestoreAdmin } from "@/lib/firebaseAdmin";
import { appInfo } from "./appInfo";
import { decode } from 'html-entities';

const APP_DOMAIN = process.env.APP_URL || "https://perfektmart.com.ng";

function cleanText(str?: string) {
  return str ? decode(str).replace(/\s+/g, " ").trim() : "";
}

// Known sites that block scraping → prefer LinkPreview directly
const LINK_PREVIEW_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
];

/** Normalize a URL string */
export function normalizeUrl(raw: string): string {
  const url = raw.trim();

  // Already absolute
  if (/^https?:\/\//i.test(url)) return url;

  // Domain with optional path (e.g., x.com, www.x.com/abc123)
  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(url)) {
    return "https://" + url;
  }

  // Fallback
  return url;
}


/** Extract links from plain text */
export function extractLinks(text: string): string[] {
  const urlRegex =
    /((?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*))/gi;

  return [...text.matchAll(urlRegex)].map(m => normalizeUrl(m[0]));
}

export async function isSafeLink(url: string): Promise<{
  safe: boolean;
  source: "google" | "virustotal" | "unknown";
  reason?: string;
}> {
  try {
    // 1. Google Safe Browsing API check
    const googleRes = await fetch(
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
    const vtRes = await fetch(`https://www.virustotal.com/api/v3/urls`, {
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
      const analysisRes = await fetch(
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
  const res = await fetch(
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


export async function fetchMetadata(rawUrl: string) {
  try {
    const normalized = normalizeUrl(rawUrl);
    const { hostname } = new URL(normalized);

    // If blocked domain → go straight to LinkPreview
    if (LINK_PREVIEW_DOMAINS.some(d => hostname.endsWith(d))) {
      return await fetchWithLinkPreview(normalized);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(normalized, {
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

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
        const res2 = await fetch(wwwUrl, { redirect: "follow" });
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

    return { url: normalized, title, description, image };
  } catch (err) {
    console.error("Metadata fetch failed:", err);
    return { url: rawUrl, title: "", description: "", image: "" };
  }
}

/** If link points to your own domain, resolve as post */
export async function resolveNativePost(rawUrl: string) {
  try {
    const normalized = normalizeUrl(rawUrl);
    const u = new URL(normalized);

    // Extract just the host from APP_DOMAIN
    const appHost = new URL(APP_DOMAIN).hostname;

    // Strict domain check (prevent evil.com/perfektmart.com.ng.evil)
    if (u.hostname === appHost || u.hostname.endsWith("." + appHost)) {
      const pathParts = u.pathname.split("/").filter(Boolean);
      const postId = pathParts.at(-1); // cleaner way
      if (!postId) return null;

      const snap = await firestoreAdmin.collection("posts").doc(postId).get();
      if (snap.exists) {
        return { ...snap.data(), id: snap.id };
      }
    }
  } catch (err) {
    console.error("Native post resolution failed:", err);
  }
  return null;
}