"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Eye, Pencil, Plus, Trash2 } from "lucide-react";
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
import { deleteArticle, type ArticleProps } from "@/app/actions/articles";

function MyArticleRow({ article, onDeleted }: { article: ArticleProps; onDeleted: (id: string) => void }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteArticle(article.id);
      toast.success("Article deleted");
      onDeleted(article.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete article");
      setIsDeleting(false);
    }
  };

  const timestamp = article.status === "published" && article.publishedAt ? article.publishedAt : article.updatedAt;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
      <Link href={`/articles/${article.authorUsername}/${article.slug}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant={article.status === "published" ? "default" : "secondary"} className="shrink-0">
            {article.status === "published" ? "Published" : "Draft"}
          </Badge>
          <p className="truncate text-sm font-medium">{article.title || "Untitled"}</p>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{formatDistanceToNow(new Date(timestamp), { addSuffix: true })}</span>
          {article.status === "published" ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Eye className="size-3" aria-hidden="true" />
                {article.viewCount}
              </span>
            </>
          ) : null}
        </p>
      </Link>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button size="sm" variant="outline" asChild aria-label={`Edit "${article.title || "Untitled"}"`}>
          <Link href={`/articles/compose?id=${article.id}`}>
            <Pencil className="size-3.5" aria-hidden="true" />
          </Link>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              aria-label={`Delete "${article.title || "Untitled"}"`}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this article?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes &quot;{article.title || "Untitled"}&quot;. This can&apos;t be undone.
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
  );
}

export default function MyArticlesClient({ initialArticles }: { initialArticles: ArticleProps[] }) {
  const [articles, setArticles] = useState(initialArticles);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/articles"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Back to Articles
      </Link>

      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">My Articles</h1>
        <Button asChild className="shrink-0 gap-1.5">
          <Link href="/articles/compose">
            <Plus className="size-4" aria-hidden="true" />
            New
          </Link>
        </Button>
      </div>

      {articles.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          You haven&apos;t written any articles yet.
        </p>
      ) : (
        <div className="space-y-2">
          {articles.map(article => (
            <MyArticleRow
              key={article.id}
              article={article}
              onDeleted={id => setArticles(prev => prev.filter(a => a.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
