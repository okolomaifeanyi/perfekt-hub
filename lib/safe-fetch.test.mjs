import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchFollowingValidatedRedirects,
  BlockedUrlError,
  TooManyRedirectsError,
} from "./safe-fetch.mjs";

function makeResponse({ status = 200, location, ok } = {}) {
  return {
    status,
    ok: ok ?? (status >= 200 && status < 300),
    headers: {
      get: name => (name.toLowerCase() === "location" ? location ?? null : null),
    },
  };
}

test("fetchFollowingValidatedRedirects returns the response when the URL is public and there's no redirect", async () => {
  const res = await fetchFollowingValidatedRedirects("https://example.com", {
    isPublicUrl: async () => true,
    fetchImpl: async () => makeResponse({ status: 200 }),
  });

  assert.equal(res.status, 200);
});

test("fetchFollowingValidatedRedirects rejects a non-public starting URL without fetching", async () => {
  let fetchCalled = false;

  await assert.rejects(
    () =>
      fetchFollowingValidatedRedirects("http://169.254.169.254/", {
        isPublicUrl: async () => false,
        fetchImpl: async () => {
          fetchCalled = true;
          return makeResponse({ status: 200 });
        },
      }),
    BlockedUrlError
  );

  assert.equal(fetchCalled, false);
});

test("fetchFollowingValidatedRedirects blocks a redirect that points at a non-public address", async () => {
  const checkedUrls = [];

  await assert.rejects(
    () =>
      fetchFollowingValidatedRedirects("https://public-looking.example/", {
        isPublicUrl: async url => {
          checkedUrls.push(url);
          return !url.includes("169.254.169.254");
        },
        fetchImpl: async url => {
          if (url === "https://public-looking.example/") {
            return makeResponse({
              status: 302,
              location: "http://169.254.169.254/latest/meta-data/",
            });
          }
          throw new Error("should not fetch the blocked redirect target");
        },
      }),
    BlockedUrlError
  );

  assert.ok(checkedUrls.includes("http://169.254.169.254/latest/meta-data/"));
});

test("fetchFollowingValidatedRedirects follows a chain of public redirects to the final response", async () => {
  const hops = [
    "https://a.example/",
    "https://b.example/",
    "https://c.example/",
  ];

  const res = await fetchFollowingValidatedRedirects(hops[0], {
    isPublicUrl: async () => true,
    fetchImpl: async url => {
      const index = hops.indexOf(url);
      if (index === -1) throw new Error(`unexpected url ${url}`);
      if (index < hops.length - 1) {
        return makeResponse({ status: 301, location: hops[index + 1] });
      }
      return makeResponse({ status: 200 });
    },
  });

  assert.equal(res.status, 200);
});

test("fetchFollowingValidatedRedirects gives up after exceeding the redirect limit", async () => {
  await assert.rejects(
    () =>
      fetchFollowingValidatedRedirects("https://loop.example/0", {
        isPublicUrl: async () => true,
        maxRedirects: 3,
        fetchImpl: async url => {
          const n = Number(url.split("/").pop());
          return makeResponse({
            status: 302,
            location: `https://loop.example/${n + 1}`,
          });
        },
      }),
    TooManyRedirectsError
  );
});

test("fetchFollowingValidatedRedirects rejects a redirect response with no Location header", async () => {
  await assert.rejects(
    () =>
      fetchFollowingValidatedRedirects("https://example.com", {
        isPublicUrl: async () => true,
        fetchImpl: async () => makeResponse({ status: 302 }),
      }),
    /Location/
  );
});
