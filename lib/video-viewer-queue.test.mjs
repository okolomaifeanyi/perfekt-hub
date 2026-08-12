import test from "node:test";
import assert from "node:assert/strict";
import { buildVideoViewerQueue, hasVideoMedia } from "./video-viewer-queue.mjs";

test("hasVideoMedia detects video posts", () => {
  assert.equal(hasVideoMedia({ media: [{ type: "video", src: "video.mp4" }] }), true);
  assert.equal(hasVideoMedia({ media: [{ type: "image", src: "image.jpg" }] }), false);
});

test("buildVideoViewerQueue keeps the current post first and ranks the rest", () => {
  const currentPost = {
    id: "current",
    media: [{ type: "video", src: "current.mp4" }],
    content: "current #one",
    views: 2,
    likes: 1,
    quoteCount: 0,
    replyCount: 0,
  };

  const feedPosts = [
    {
      id: "beta",
      media: [{ type: "video", src: "beta.mp4" }],
      content: "beta",
      views: 2,
      likes: 8,
      quoteCount: 0,
      replyCount: 0,
    },
    {
      id: "alpha",
      media: [{ type: "video", src: "alpha.mp4" }],
      content: "alpha #tag",
      views: 12,
      likes: 1,
      quoteCount: 0,
      replyCount: 0,
    },
    {
      id: "image-only",
      media: [{ type: "image", src: "image.jpg" }],
      content: "ignored",
      views: 100,
      likes: 100,
      quoteCount: 100,
      replyCount: 100,
    },
  ];

  const queue = buildVideoViewerQueue({
    currentPost,
    feedPosts,
    targetSize: 3,
  });

  assert.equal(queue.length, 3);
  assert.equal(queue[0].id, "current");
  assert.equal(queue[1].id, "alpha");
  assert.equal(queue[2].id, "beta");
});
