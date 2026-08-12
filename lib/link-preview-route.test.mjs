import assert from "node:assert/strict";
import test from "node:test";
import { resolveLinkPreviewRequest } from "./link-preview-route.mjs";

test("resolveLinkPreviewRequest rejects missing url", async () => {
  const result = await resolveLinkPreviewRequest(
    "https://example.com/api/link-preview"
  );

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, { error: "Missing url" });
});

test("resolveLinkPreviewRequest forwards metadata", async () => {
  const result = await resolveLinkPreviewRequest(
    "https://example.com/api/link-preview?url=https%3A%2F%2Fopenai.com",
    async url => ({
      url,
      title: "OpenAI",
      description: "AI research and deployment",
      image: "https://example.com/image.png",
    })
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    url: "https://openai.com",
    title: "OpenAI",
    description: "AI research and deployment",
    image: "https://example.com/image.png",
  });
});

test("resolveLinkPreviewRequest returns 404 when metadata is unavailable", async () => {
  const result = await resolveLinkPreviewRequest(
    "https://example.com/api/link-preview?url=https%3A%2F%2Fexample.com",
    async () => null
  );

  assert.equal(result.status, 404);
  assert.deepEqual(result.body, { error: "Unable to generate preview" });
});
