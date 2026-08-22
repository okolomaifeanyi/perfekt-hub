"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Eye, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import JustAvatar from "@/components/JustAvatar";
import { ContainedImage } from "@/components/media/ContainedImage";
import { useUserStore } from "@/lib/store/useUserStore";
import { deleteArticle, publishArticle, unpublishArticle, type ArticleProps } from "@/app/actions/articles";
import { renderMarkdownToSafeHtml } from "@/lib/articles.mjs";
import { ARTICLE_CONTENT_CLASS } from "@/lib/article-content-style.mjs";

export default function ArticleDetailClient({ article: initialArticle }: { article: ArticleProps }) {
  const currentUser = useUserStore(state => state.user);
  const router = useRouter();
  const [article, setArticle] = useState(initialArticle);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const isAuthor = currentUser?.uid === article.authorUid;
  const bodyHtml = renderMarkdownToSafeHtml(article.body);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteArticle(article.id);
      toast.success("Article deleted");
      router.push("/articles");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete article");
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async () => {
    setIsTogglingStatus(true);
    try {
      const updated =
        article.status === "published" ? await unpublishArticle(article.id) : await publishArticle(article.id);
      setArticle(updated);
      toast.success(updated.status === "published" ? "Article published" : "Article unpublished");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update article");
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 pt-4">
      <Link
        href="/articles"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Back to Articles
      </Link>

      {isAuthor ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>This is your article.</span>
            {article.status === "draft" ? <Badge variant="secondary">Draft — only you can see this</Badge> : null}
          </div>

          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={handleToggleStatus} disabled={isTogglingStatus}>
              {article.status === "published" ? "Unpublish" : "Publish"}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/articles/compose?id=${article.id}`}>
                <Pencil className="size-3.5" aria-hidden="true" />
                Edit
              </Link>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this article?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes &quot;{article.title}&quot;. This can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting…" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : null}

      <article className="overflow-hidden rounded-xl border border-border/60">
        {article.coverImageUrl ? (
          <ContainedImage
            src={article.coverImageUrl}
            alt=""
            className="aspect-[2/1] w-full"
            sizes="(min-width: 768px) 672px, 100vw"
            priority
            unoptimized
          />
        ) : null}

        <div className="space-y-4 p-5">
          <h1 className="text-2xl font-semibold leading-snug">{article.title}</h1>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/${article.authorUsername}`} className="flex items-center gap-2 hover:text-foreground">
              <JustAvatar size={28} username={article.authorUsername} />
              <span>@{article.authorUsername}</span>
            </Link>
            <span aria-hidden="true">·</span>
            <span>{article.readingMinutes} min read</span>
            {article.publishedAt ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>
              </>
            ) : null}
            {isAuthor ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-3.5" aria-hidden="true" />
                  {article.viewCount}
                </span>
              </>
            ) : null}
          </div>

          <div className={`text-sm ${ARTICLE_CONTENT_CLASS}`} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </div>
      </article>
    </div>
  );
}
