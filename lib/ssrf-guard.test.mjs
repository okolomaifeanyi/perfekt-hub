import assert from "node:assert/strict";
import test from "node:test";
import { isPublicHttpUrl } from "./ssrf-guard.mjs";

test("isPublicHttpUrl blocks loopback IPs", async () => {
  assert.equal(await isPublicHttpUrl("http://127.0.0.1/"), false);
  assert.equal(await isPublicHttpUrl("http://127.1.2.3/"), false);
  assert.equal(await isPublicHttpUrl("http://[::1]/"), false);
});

test("isPublicHttpUrl blocks the cloud metadata address", async () => {
  assert.equal(await isPublicHttpUrl("http://169.254.169.254/latest/meta-data/"), false);
});

test("isPublicHttpUrl blocks private ranges", async () => {
  assert.equal(await isPublicHttpUrl("http://10.0.0.5/"), false);
  assert.equal(await isPublicHttpUrl("http://172.16.0.5/"), false);
  assert.equal(await isPublicHttpUrl("http://192.168.1.5/"), false);
});

test("isPublicHttpUrl blocks the localhost hostname", async () => {
  assert.equal(await isPublicHttpUrl("http://localhost:8080/"), false);
});

test("isPublicHttpUrl blocks non-http(s) protocols", async () => {
  assert.equal(await isPublicHttpUrl("file:///etc/passwd"), false);
  assert.equal(await isPublicHttpUrl("ftp://example.com/"), false);
});

test("isPublicHttpUrl rejects hostnames that resolve to a private address", async () => {
  const lookup = async () => [{ address: "10.0.0.9", family: 4 }];
  assert.equal(
    await isPublicHttpUrl("https://internal.example.com/", { lookup }),
    false
  );
});

test("isPublicHttpUrl allows a public hostname resolving to a public address", async () => {
  const lookup = async () => [{ address: "93.184.216.34", family: 4 }];
  assert.equal(
    await isPublicHttpUrl("https://example.com/page", { lookup }),
    true
  );
});

test("isPublicHttpUrl allows a public literal IP", async () => {
  assert.equal(await isPublicHttpUrl("http://93.184.216.34/"), true);
});
