import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain", "ip6-localhost"]);

function isPrivateIPv4(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n))) return true;

  const [a, b] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata (169.254.169.254)
  if (a === 0) return true; // "this" network
  if (a >= 224) return true; // multicast / reserved

  return false;
}

function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true; // loopback / unspecified
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local

  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    return net.isIP(mapped) === 4 ? isPrivateIPv4(mapped) : true;
  }

  return false;
}

function isPrivateAddress(ip) {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // unrecognizable address — fail closed
}

/**
 * Guards against SSRF: rejects non-http(s) protocols and any hostname that
 * resolves to a loopback/private/link-local address (incl. the 169.254.169.254
 * cloud metadata endpoint), so server-side fetches can't be pointed at internal
 * infrastructure via a user-supplied URL.
 */
export async function isPublicHttpUrl(urlString, { lookup = dns.lookup } = {}) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return false;
  }

  if (net.isIP(hostname)) {
    return !isPrivateAddress(hostname);
  }

  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (!records || records.length === 0) return false;
    return records.every(record => !isPrivateAddress(record.address));
  } catch {
    return false;
  }
}
