import test from "node:test";
import assert from "node:assert/strict";
import { buildVideoMetadata } from "./video-metadata.mjs";

test("buildVideoMetadata keeps canonical and social metadata aligned", () => {
  const meta = buildVideoMetadata({
    username: "jane",
    postId: "post-123",
    title: "Sunset reel",
    description: "Video post on Perfekthub",
    image: "https://cdn.example.com/post.jpg",
  });

  assert.equal(meta.alternates.canonical, "/jane/post-123");
  assert.equal(meta.openGraph.url, "/jane/post-123/video");
  assert.equal(meta.openGraph.images[0].url, "https://cdn.example.com/post.jpg");
});
