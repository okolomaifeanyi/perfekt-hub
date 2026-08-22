// Shared, framework-free helpers for the "Compose Article" feature — kept
// as plain functions with no Supabase/Next.js imports so they're trivially
// unit-testable (see articles.test.mjs) and reusable from both the server
// action (app/actions/articles.ts) and anywhere else that needs the same
// slug/excerpt/reading-time/markdown logic without a request context.

export const ARTICLE_TITLE_MAX_LENGTH = 140;
export const ARTICLE_BODY_MIN_LENGTH = 1;
export const ARTICLE_BODY_MAX_LENGTH = 40000;
const EXCERPT_MAX_LENGTH = 200;
const WORDS_PER_MINUTE = 200;

/**
 * Validates article input before it's ever sent to the database. Returns
 * {valid, errors} rather than throwing on the first problem, so a caller
 * (the compose form, the server action) can show every issue at once.
 */
export function validateArticleInput({ title, body }) {
  const errors = [];
  const trimmedTitle = (title ?? "").trim();
  const trimmedBody = (body ?? "").trim();

  if (!trimmedTitle) {
    errors.push("Title is required.");
  } else if (trimmedTitle.length > ARTICLE_TITLE_MAX_LENGTH) {
    errors.push(`Title must be ${ARTICLE_TITLE_MAX_LENGTH} characters or fewer.`);
  }

  if (trimmedBody.length < ARTICLE_BODY_MIN_LENGTH) {
    errors.push("Article body cannot be empty.");
  } else if (trimmedBody.length > ARTICLE_BODY_MAX_LENGTH) {
    errors.push(`Article body must be ${ARTICLE_BODY_MAX_LENGTH.toLocaleString()} characters or fewer.`);
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true, errors: [] };
}

/**
 * Turns a title into a URL-safe slug: lowercase, accents stripped,
 * non-alphanumerics collapsed to a single hyphen, no leading/trailing
 * hyphen. Falls back to "article" for a title that strips to nothing (all
 * punctuation/emoji/non-Latin symbols), so a slug is never empty.
 */
export function slugify(title) {
  const slug = (title ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents left behind by NFKD decomposition
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "article";
}

/**
 * Appends "-2", "-3", etc. until `candidate` isn't in `existingSlugs` — used
 * when an author already has an article at that slug (slugs are unique per
 * author, not globally — see the articles migration). Starts at -2 so the
 * first article at a given title keeps the clean, unsuffixed slug.
 */
export function dedupeSlug(candidate, existingSlugs) {
  const taken = new Set(existingSlugs ?? []);
  if (!taken.has(candidate)) return candidate;

  let attempt = 2;
  while (taken.has(`${candidate}-${attempt}`)) attempt += 1;
  return `${candidate}-${attempt}`;
}

/**
 * Strips markdown syntax down to plain text and truncates on a word
 * boundary — used for the listing-page preview and for the <meta
 * description>/OG description, so neither shows raw "##"/"**" markup.
 */
export function deriveExcerpt(body, maxLength = EXCERPT_MAX_LENGTH) {
  const plain = (body ?? "")
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> link text
    .replace(/^\s{0,3}>+\s?/gm, "") // blockquote markers
    .replace(/^#{1,6}\s+/gm, "") // heading markers
    .replace(/[*_~]/g, "") // emphasis markers
    .replace(/^[-*]\s+/gm, "") // unordered list markers
    .replace(/^\d+\.\s+/gm, "") // ordered list markers
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) return plain;

  const truncated = plain.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${(lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trim()}…`;
}

/** Rounds up so a 30-second read still shows "1 min read", never "0 min read". */
export function estimateReadingMinutes(body) {
  const wordCount = (body ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

const HTTP_URL_PATTERN = /^https?:\/\//i;

/**
 * Cover images are pasted by hand as a plain URL (there's no upload flow
 * for them yet — see the compose page), so this is the only thing standing
 * between an arbitrary string and an <img src>. Restricting to http(s)
 * rules out `javascript:`/`data:`/etc. URIs without needing a full
 * URL-parsing dependency. Empty/undefined is valid — the field is optional.
 */
export function isValidCoverImageUrl(url) {
  if (!url) return true;
  return HTTP_URL_PATTERN.test(url.trim());
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SAFE_LINK_PROTOCOLS = /^(https?:|mailto:)/i;

function renderInline(text) {
  // Escape first — every character of the author's raw input becomes inert
  // text before any markdown syntax is turned into a tag, so there's no way
  // for e.g. `<img src=x onerror=alert(1)>` typed into the body to survive
  // as a real tag. Everything below only ever wraps already-escaped text.
  let html = escapeHtml(text);

  // Links: [label](url) — only http(s)/mailto survive as a real link;
  // anything else (most importantly javascript:) is left as the original
  // escaped text instead of becoming a clickable anchor.
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
    if (!SAFE_LINK_PROTOCOLS.test(url)) return match;
    return `<a href="${url}" rel="noopener noreferrer nofollow" target="_blank">${label}</a>`;
  });

  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  return html;
}

/**
 * Converts a deliberately small, safe subset of markdown to HTML: headings
 * (# through ###), bold/italic, inline code, fenced code blocks, links
 * (http/https/mailto only), blockquotes, unordered/ordered lists, and
 * paragraphs.
 *
 * This is NOT a full CommonMark implementation, and that's on purpose: the
 * output never needs a separate HTML-sanitizer pass, because there is no
 * raw-HTML passthrough to sanitize in the first place — every tag this
 * function emits is one it generated itself, wrapped around text that went
 * through escapeHtml() first (see renderInline). Adding a "just let raw
 * HTML through" escape hatch here would reopen exactly the XSS hole this
 * function exists to avoid, so resist that temptation if this ever needs
 * more markdown features.
 */
export function renderMarkdownToSafeHtml(markdown) {
  const source = (markdown ?? "").replace(/\r\n/g, "\n");
  const lines = source.split("\n");
  const htmlBlocks = [];
  let paragraphLines = [];
  let listItems = null; // { tag: "ul" | "ol", items: string[] }
  let inCodeBlock = false;
  let codeLines = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    htmlBlocks.push(`<p>${renderInline(paragraphLines.join(" "))}</p>`);
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listItems) return;
    const items = listItems.items.map(item => `<li>${renderInline(item)}</li>`).join("");
    htmlBlocks.push(`<${listItems.tag}>${items}</${listItems.tag}>`);
    listItems = null;
  };

  const flushCodeBlock = () => {
    htmlBlocks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    codeLines = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        flushParagraph();
        flushList();
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      htmlBlocks.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    const quoteMatch = /^>\s?(.*)$/.exec(line);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      htmlBlocks.push(`<blockquote><p>${renderInline(quoteMatch[1])}</p></blockquote>`);
      continue;
    }

    const unorderedMatch = /^[-*]\s+(.*)$/.exec(line);
    const orderedMatch = unorderedMatch ? null : /^\d+\.\s+(.*)$/.exec(line);
    if (unorderedMatch || orderedMatch) {
      flushParagraph();
      const tag = unorderedMatch ? "ul" : "ol";
      const text = (unorderedMatch ?? orderedMatch)[1];
      if (!listItems || listItems.tag !== tag) {
        flushList();
        listItems = { tag, items: [] };
      }
      listItems.items.push(text);
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    if (listItems) flushList();
    paragraphLines.push(line.trim());
  }

  if (inCodeBlock) {
    // Unterminated fence at end of input — still render what was captured
    // rather than silently dropping it.
    flushCodeBlock();
  }
  flushParagraph();
  flushList();

  return htmlBlocks.join("\n");
}
