import assert from "node:assert/strict";
import test from "node:test";
import { createHardenedLookup } from "./ssrf-dispatcher.mjs";

test("createHardenedLookup rejects a hostname resolving to a private address", async () => {
  const lookup = createHardenedLookup({
    lookup: async () => [{ address: "169.254.169.254", family: 4 }],
  });

  await new Promise(resolve => {
    lookup("metadata.internal", {}, err => {
      assert.match(err.message, /Refusing to connect/);
      resolve();
    });
  });
});

test("createHardenedLookup rejects when any resolved address is private, even if others are public", async () => {
  const lookup = createHardenedLookup({
    lookup: async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ],
  });

  await new Promise(resolve => {
    lookup("mixed.example", {}, err => {
      assert.ok(err);
      resolve();
    });
  });
});

test("createHardenedLookup resolves with a single address when options.all isn't set", async () => {
  const lookup = createHardenedLookup({
    lookup: async () => [{ address: "93.184.216.34", family: 4 }],
  });

  await new Promise(resolve => {
    lookup("public.example", {}, (err, address, family) => {
      assert.equal(err, null);
      assert.equal(address, "93.184.216.34");
      assert.equal(family, 4);
      resolve();
    });
  });
});

test("createHardenedLookup resolves with the full address list when options.all is set", async () => {
  const lookup = createHardenedLookup({
    lookup: async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "93.184.216.35", family: 4 },
    ],
  });

  await new Promise(resolve => {
    lookup("public.example", { all: true }, (err, addresses) => {
      assert.equal(err, null);
      assert.equal(addresses.length, 2);
      resolve();
    });
  });
});

test("createHardenedLookup errors when the underlying lookup rejects", async () => {
  const lookup = createHardenedLookup({
    lookup: async () => {
      throw new Error("ENOTFOUND");
    },
  });

  await new Promise(resolve => {
    lookup("missing.example", {}, err => {
      assert.ok(err);
      resolve();
    });
  });
});

test("createHardenedLookup errors when no addresses resolve", async () => {
  const lookup = createHardenedLookup({
    lookup: async () => [],
  });

  await new Promise(resolve => {
    lookup("empty.example", {}, err => {
      assert.match(err.message, /No addresses resolved/);
      resolve();
    });
  });
});
