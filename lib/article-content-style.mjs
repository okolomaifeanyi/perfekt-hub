// Shared styling for rendered article body HTML (the output of
// renderMarkdownToSafeHtml in lib/articles.mjs) — used by both the compose
// page's Preview tab and the published article detail page, so a draft
// previews exactly how it will actually look once published. Written as
// Tailwind arbitrary-variant child selectors rather than the
// @tailwindcss/typography plugin's `prose` classes, since that plugin isn't
// a project dependency — this keeps the article feature fully
// self-contained without adding one just for this.
export const ARTICLE_CONTENT_CLASS =
  "[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:first:mt-0 " +
  "[&_h2]:mt-5 [&_h2]:mb-2.5 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:first:mt-0 " +
  "[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:first:mt-0 " +
  "[&_p]:my-3 [&_p]:leading-relaxed " +
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 " +
  "[&_strong]:font-semibold [&_em]:italic " +
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 " +
  "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground " +
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm " +
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0";
