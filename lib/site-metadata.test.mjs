import assert from "node:assert/strict";
import test from "node:test";
import { buildSiteMetadata } from "./site-metadata.mjs";

test("buildSiteMetadata keeps metadataBase, robots, and open graph aligned", () => {
  const metadata = buildSiteMetadata({
    canonical: "https://example.com/jane/post-123",
    title: "Sunset reel",
    description: "Video post on Perfekthub",
  });

  assert.equal(metadata.metadataBase.toString(), "https://example.com/");
  assert.equal(metadata.robots.index, true);
  assert.equal(metadata.openGraph.title, "Sunset reel");
});
