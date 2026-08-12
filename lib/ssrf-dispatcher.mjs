import dns from "node:dns/promises";
import { Agent } from "undici";
import { isPrivateAddress } from "./ssrf-guard.mjs";

/**
 * Builds a dns.lookup-compatible resolver that rejects any address in a
 * private/loopback/link-local range, evaluated at the moment a TCP
 * connection actually opens rather than during an earlier, separate
 * validation call. A hostname can pass an upfront check (isPublicHttpUrl)
 * and still resolve differently by the time the real connection is made —
 * DNS rebinding. Pinning the same validation to the connect step closes
 * that window: the address that gets checked is the address that gets
 * connected to, with nothing in between for a rebinding attacker to flip.
 */
export function createHardenedLookup({ lookup = dns.lookup } = {}) {
  return function hardenedLookup(hostname, options, callback) {
    const opts = typeof options === "function" ? {} : options ?? {};
    const cb = typeof options === "function" ? options : callback;

    lookup(hostname, { ...opts, all: true })
      .then(records => {
        const list = Array.isArray(records) ? records : [records];
        if (list.length === 0) {
          cb(new Error(`No addresses resolved for ${hostname}`));
          return;
        }

        const blocked = list.find(record => isPrivateAddress(record.address));
        if (blocked) {
          cb(
            new Error(
              `Refusing to connect to private address ${blocked.address} for ${hostname}`
            )
          );
          return;
        }

        if (opts.all) {
          cb(null, list);
        } else {
          cb(null, list[0].address, list[0].family);
        }
      })
      .catch(cb);
  };
}

let sharedDispatcher;

/**
 * Shared undici Agent whose underlying connections are DNS-pinned via
 * createHardenedLookup, for use as `fetch(url, { dispatcher })`.
 */
export function getSsrfSafeDispatcher() {
  if (!sharedDispatcher) {
    sharedDispatcher = new Agent({
      connect: { lookup: createHardenedLookup() },
    });
  }
  return sharedDispatcher;
}
