"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUserStore } from "@/lib/store/useUserStore";
import { createArticle, publishArticle, updateArticle, type ArticleProps } from "@/app/actions/articles";
import {
  ARTICLE_BODY_MAX_LENGTH,
  ARTICLE_TITLE_MAX_LENGTH,
  renderMarkdownToSafeHtml,
  validateArticleInput,
} from "@/lib/articles.mjs";
import { ARTICLE_CONTENT_CLASS } from "@/lib/article-content-style.mjs";

export default function ComposeArticleClient({ initialArticle }: { initialArticle?: ArticleProps | null }) {
  const user = useUserStore(state => state.user);
  const router = useRouter();

  const [articleId, setArticleId] = useState<string | null>(initialArticle?.id ?? null);
  const [title, setTitle] = useState(initialArticle?.title ?? "");
  const [body, setBody] = useState(initialArticle?.body ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialArticle?.coverImageUrl ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const busy = isSavingDraft || isPublishing;
  // Editing an article that's already live shows one "Save changes" button
  // instead of "Save draft" + "Publish" — "Publish" reads as a no-op (it's
  // already published) and "Save draft" reads like it would unpublish,
  // when really both buttons in that state should just update the content
  // in place and leave status alone.
  const isEditingPublished = initialArticle?.status === "published";

  // Client-side markdown rendering for the Preview tab — safe to render via
  // dangerouslySetInnerHTML specifically because renderMarkdownToSafeHtml
  // escapes every character of the input before it ever wraps anything in
  // a tag (see lib/articles.mjs); there is no raw-HTML passthrough here for
  // an author to exploit, unlike a typical dangerouslySetInnerHTML usage.
  const previewHtml = useMemo(() => renderMarkdownToSafeHtml(body), [body]);

  const validateOrShowErrors = () => {
    const result = validateArticleInput({ title, body });
    setErrors(result.errors);
    return result.valid;
  };

  const handleSaveDraft = async () => {
    if (!validateOrShowErrors()) return;
    setIsSavingDraft(true);
    try {
      if (articleId) {
        await updateArticle(articleId, { title, body, coverImageUrl: coverImageUrl || null });
      } else {
        const created = await createArticle({ title, body, coverImageUrl: coverImageUrl || null, status: "draft" });
        setArticleId(created.id);
        // Without this, refreshing the page (or losing this component's
        // state any other way) would lose track of which article this
        // draft is — the next save click would create a *second* article
        // instead of updating the first.
        router.replace(`/articles/compose?id=${created.id}`, { scroll: false });
      }
      toast.success(isEditingPublished ? "Changes saved" : "Draft saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save changes");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    if (!validateOrShowErrors()) return;
    setIsPublishing(true);
    try {
      const article = articleId
        ? await (async () => {
            await updateArticle(articleId, { title, body, coverImageUrl: coverImageUrl || null });
            return publishArticle(articleId);
          })()
        : await createArticle({ title, body, coverImageUrl: coverImageUrl || null, status: "published" });

      toast.success("Article published");
      router.push(`/articles/${article.authorUsername}/${article.slug}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish article");
    } finally {
      setIsPublishing(false);
    }
  };

  if (!user) {
    // Belt-and-suspenders — proxy.ts's middleware already keeps a
    // signed-out visitor from reaching this page at all (see page.tsx).
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
        You need to be signed in to write an article.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/articles"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Back to Articles
      </Link>

      <h1 className="mb-6 text-2xl font-semibold">
        {initialArticle ? `Editing "${initialArticle.title}"` : "Write an Article"}
      </h1>

      {errors.length > 0 ? (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <ul className="list-inside list-disc space-y-0.5">
            {errors.map(error => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="article-title">Title</Label>
          <Input
            id="article-title"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Give your article a title"
            maxLength={ARTICLE_TITLE_MAX_LENGTH}
          />
          <p className="text-right text-xs text-muted-foreground">
            {title.length}/{ARTICLE_TITLE_MAX_LENGTH}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="article-cover">Cover image URL (optional)</Label>
          <Input
            id="article-cover"
            type="url"
            inputMode="url"
            value={coverImageUrl}
            onChange={event => setCoverImageUrl(event.target.value)}
            placeholder="https://example.com/cover.jpg"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="article-body">Article</Label>
          <Tabs defaultValue="write">
            <TabsList>
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="write">
              <Textarea
                id="article-body"
                value={body}
                onChange={event => setBody(event.target.value)}
                placeholder="Write your article in Markdown — # headings, **bold**, *italic*, [links](https://…), lists, > quotes, and ```code blocks``` are all supported."
                className="min-h-80 font-mono text-sm"
                maxLength={ARTICLE_BODY_MAX_LENGTH}
              />
              <p className="text-right text-xs text-muted-foreground">
                {body.length}/{ARTICLE_BODY_MAX_LENGTH}
              </p>
            </TabsContent>

            <TabsContent value="preview">
              {body.trim() ? (
                <div
                  className={`min-h-80 rounded-md border border-input px-3 py-2 text-sm ${ARTICLE_CONTENT_CLASS}`}
                  // eslint-disable-next-line react/no-danger -- see previewHtml's comment above: output is escaped/controlled, not raw author HTML.
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <p className="min-h-80 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground">
                  Nothing to preview yet — write something in the Write tab.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          {isEditingPublished ? (
            <Button type="button" onClick={handleSaveDraft} disabled={busy}>
              {isSavingDraft ? "Saving…" : "Save changes"}
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={busy}>
                {isSavingDraft ? "Saving…" : "Save draft"}
              </Button>
              <Button type="button" onClick={handlePublish} disabled={busy}>
                {isPublishing ? "Publishing…" : "Publish"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
