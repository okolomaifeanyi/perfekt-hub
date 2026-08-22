import assert from "node:assert/strict";
import test from "node:test";
import {
  ARTICLE_BODY_MAX_LENGTH,
  ARTICLE_TITLE_MAX_LENGTH,
  dedupeSlug,
  deriveExcerpt,
  estimateReadingMinutes,
  isValidCoverImageUrl,
  renderMarkdownToSafeHtml,
  slugify,
  validateArticleInput,
} from "./articles.mjs";

test("validateArticleInput requires a non-empty title", () => {
  const result = validateArticleInput({ title: "   ", body: "Some body text." });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /title is required/i.test(e)));
});

test("validateArticleInput rejects a title over the max length", () => {
  const result = validateArticleInput({
    title: "a".repeat(ARTICLE_TITLE_MAX_LENGTH + 1),
    body: "Some body text.",
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /fewer/i.test(e)));
});

test("validateArticleInput rejects an empty body", () => {
  const result = validateArticleInput({ title: "A title", body: "   " });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /cannot be empty/i.test(e)));
});

test("validateArticleInput rejects a body over the max length", () => {
  const result = validateArticleInput({
    title: "A title",
    body: "a".repeat(ARTICLE_BODY_MAX_LENGTH + 1),
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => /fewer/i.test(e)));
});

test("validateArticleInput accepts valid input and reports no errors", () => {
  const result = validateArticleInput({ title: "A great title", body: "A perfectly fine body." });
  assert.deepEqual(result, { valid: true, errors: [] });
});

test("slugify lowercases and hyphenates", () => {
  assert.equal(slugify("How To Build A Social App"), "how-to-build-a-social-app");
});

test("slugify strips accents and punctuation", () => {
  assert.equal(slugify("Café — Déjà Vu!!"), "cafe-deja-vu");
});

test("slugify falls back to 'article' when the title strips to nothing", () => {
  assert.equal(slugify("🎉🎉🎉"), "article");
  assert.equal(slugify(""), "article");
});

test("dedupeSlug returns the candidate unchanged when it's free", () => {
  assert.equal(dedupeSlug("my-post", ["other-post"]), "my-post");
});

test("dedupeSlug appends -2, -3, ... until it finds a free slug", () => {
  assert.equal(dedupeSlug("my-post", ["my-post"]), "my-post-2");
  assert.equal(dedupeSlug("my-post", ["my-post", "my-post-2"]), "my-post-3");
});

test("deriveExcerpt strips markdown syntax down to plain text", () => {
  const body = "# Heading\n\nSome **bold** and *italic* text with a [link](https://example.com).";
  const excerpt = deriveExcerpt(body);
  assert.equal(excerpt, "Heading Some bold and italic text with a link.");
});

test("deriveExcerpt strips fenced code blocks and images", () => {
  const body = "Intro text.\n\n```js\nconsole.log('hi');\n```\n\n![alt](https://example.com/a.png)\n\nOutro.";
  const excerpt = deriveExcerpt(body);
  assert.doesNotMatch(excerpt, /console\.log/);
  assert.doesNotMatch(excerpt, /example\.com/);
  assert.match(excerpt, /Intro text\./);
  assert.match(excerpt, /Outro\./);
});

test("deriveExcerpt truncates on a word boundary and adds an ellipsis", () => {
  const body = "word ".repeat(100).trim();
  const excerpt = deriveExcerpt(body, 50);
  assert.ok(excerpt.length <= 51);
  assert.ok(excerpt.endsWith("…"));
  assert.ok(!excerpt.slice(0, -1).endsWith(" "));
});

test("estimateReadingMinutes rounds up and never returns less than 1", () => {
  assert.equal(estimateReadingMinutes(""), 1);
  assert.equal(estimateReadingMinutes("word ".repeat(10)), 1);
  assert.equal(estimateReadingMinutes("word ".repeat(201)), 2);
  assert.equal(estimateReadingMinutes("word ".repeat(400)), 2);
  assert.equal(estimateReadingMinutes("word ".repeat(401)), 3);
});

test("renderMarkdownToSafeHtml renders headings, paragraphs, bold, and italic", () => {
  const html = renderMarkdownToSafeHtml("# Title\n\nA paragraph with **bold** and *italic* text.");
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<p>A paragraph with <strong>bold<\/strong> and <em>italic<\/em> text\.<\/p>/);
});

test("renderMarkdownToSafeHtml renders unordered and ordered lists separately", () => {
  const html = renderMarkdownToSafeHtml("- one\n- two\n\n1. first\n2. second");
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.match(html, /<ol><li>first<\/li><li>second<\/li><\/ol>/);
});

test("renderMarkdownToSafeHtml renders blockquotes and fenced code blocks", () => {
  const html = renderMarkdownToSafeHtml("> A quote\n\n```\nconst x = 1;\n```");
  assert.match(html, /<blockquote><p>A quote<\/p><\/blockquote>/);
  assert.match(html, /<pre><code>const x = 1;<\/code><\/pre>/);
});

test("renderMarkdownToSafeHtml keeps http(s)/mailto links but drops javascript: links", () => {
  const html = renderMarkdownToSafeHtml("[Safe](https://example.com) and [Unsafe](javascript:alert(1))");
  assert.match(html, /<a href="https:\/\/example\.com" rel="noopener noreferrer nofollow" target="_blank">Safe<\/a>/);
  assert.doesNotMatch(html, /<a[^>]*javascript:/);
  assert.match(html, /\[Unsafe\]\(javascript:alert\(1\)\)/);
});

test("renderMarkdownToSafeHtml escapes raw HTML/script tags instead of executing them", () => {
  const html = renderMarkdownToSafeHtml('<script>alert(1)</script> and <img src=x onerror=alert(1)>');
  // The literal text "onerror=" is fine to appear — what matters is that it
  // never lands inside a real, unescaped tag the browser would parse as an
  // element with an executable event-handler attribute.
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<img[^&]/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test("renderMarkdownToSafeHtml escapes HTML characters inside code blocks too", () => {
  const html = renderMarkdownToSafeHtml("```\n<script>alert(1)</script>\n```");
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("renderMarkdownToSafeHtml handles an unterminated code fence without dropping content", () => {
  const html = renderMarkdownToSafeHtml("```\nconst x = 1;");
  assert.match(html, /<pre><code>const x = 1;<\/code><\/pre>/);
});

test("isValidCoverImageUrl accepts http(s) URLs and treats empty as valid (field is optional)", () => {
  assert.equal(isValidCoverImageUrl("https://example.com/cover.jpg"), true);
  assert.equal(isValidCoverImageUrl("http://example.com/cover.jpg"), true);
  assert.equal(isValidCoverImageUrl(""), true);
  assert.equal(isValidCoverImageUrl(null), true);
  assert.equal(isValidCoverImageUrl(undefined), true);
});

test("isValidCoverImageUrl rejects javascript:/data:/other unsafe schemes", () => {
  assert.equal(isValidCoverImageUrl("javascript:alert(1)"), false);
  assert.equal(isValidCoverImageUrl("data:text/html,<script>alert(1)</script>"), false);
  assert.equal(isValidCoverImageUrl("ftp://example.com/cover.jpg"), false);
});

test("renderMarkdownToSafeHtml treats blank lines as paragraph breaks", () => {
  const html = renderMarkdownToSafeHtml("First paragraph.\n\nSecond paragraph.");
  assert.match(html, /<p>First paragraph\.<\/p>\n<p>Second paragraph\.<\/p>/);
});
