import test from "node:test";
import assert from "node:assert/strict";
import { isBlockedDomain, filterBlockedDomains, filterUnsafeCuratedContent } from "./curated-content-safety.mjs";

test("isBlockedDomain matches the exact domain and subdomains", () => {
  assert.equal(isBlockedDomain("https://summitpostnews.com/some-article"), true);
  assert.equal(isBlockedDomain("https://www.summitpostnews.com/some-article"), true);
  assert.equal(isBlockedDomain("https://amp.summitpostnews.com/some-article"), true);
});

test("isBlockedDomain matches cyberera.com.ng (reported by a visitor's antivirus as URL:Blacklist)", () => {
  assert.equal(isBlockedDomain("https://www.cyberera.com.ng/some-article"), true);
  assert.equal(isBlockedDomain("https://cyberera.com.ng/some-article"), true);
});

test("isBlockedDomain does not match unrelated domains or bad input", () => {
  assert.equal(isBlockedDomain("https://bbc.com/news/some-article"), false);
  assert.equal(isBlockedDomain("https://notsummitpostnews.com/x"), false);
  assert.equal(isBlockedDomain(null), false);
  assert.equal(isBlockedDomain("not a url"), false);
});

test("filterBlockedDomains drops items whose source_url is on the blocklist", () => {
  const items = [
    { id: "1", source_url: "https://bbc.com/a" },
    { id: "2", source_url: "https://summitpostnews.com/b" },
    { id: "3", source_url: null },
  ];
  const result = filterBlockedDomains(items);
  assert.deepEqual(result.map(i => i.id), ["1", "3"]);
});

test("filterUnsafeCuratedContent keeps items with no source_url without checking them", async () => {
  const items = [{ id: "1", source_url: null }, { id: "2" }];
  const { safeItems, rejected } = await filterUnsafeCuratedContent(items);
  assert.equal(safeItems.length, 2);
  assert.equal(rejected.length, 0);
});

test("filterUnsafeCuratedContent rejects blocked domains without a network call", async () => {
  const items = [
    { id: "1", source_url: "https://summitpostnews.com/bad" },
    { id: "2", source_url: null },
  ];
  const { safeItems, rejected } = await filterUnsafeCuratedContent(items);
  assert.deepEqual(safeItems.map(i => i.id), ["2"]);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason, "blocked domain");
});
