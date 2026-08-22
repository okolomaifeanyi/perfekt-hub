"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import JustAvatar from "@/components/JustAvatar";
import { ContainedImage } from "@/components/media/ContainedImage";
import { useUserStore } from "@/lib/store/useUserStore";
import { listPublishedArticles, type ArticleProps } from "@/app/actions/articles";

const PAGE_SIZE = 20;

function ArticleCard({ article }: { article: ArticleProps }) {
  return (
    <Link
      href={`/articles/${article.authorUsername}/${article.slug}`}
      className="block overflow-hidden rounded-xl border border-border/60 transition hover:border-border"
    >
      {article.coverImageUrl ? (
        <ContainedImage
          src={article.coverImageUrl}
          alt=""
          className="aspect-[2/1] w-full"
          sizes="(min-width: 768px) 640px, 100vw"
          // Cover images are pasted as plain URLs (see the compose page),
          // so they're almost never on next.config.ts's tight
          // images.remotePatterns allowlist — same reasoning ContainedImage
          // documents for post/group media.
          unoptimized
        />
      ) : null}

      <div className="space-y-2 p-4">
        <h2 className="text-lg font-semibold leading-snug">{article.title}</h2>
        {article.excerpt ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{article.excerpt}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
          <JustAvatar size={20} username={article.authorUsername} />
          <span>@{article.authorUsername}</span>
          <span aria-hidden="true">·</span>
          <span>{article.readingMinutes} min read</span>
          {article.publishedAt ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default function ArticlesFeedClient({ initialArticles }: { initialArticles: ArticleProps[] }) {
  const user = useUserStore(state => state.user);
  const [articles, setArticles] = useState(initialArticles);
  const [hasMore, setHasMore] = useState(initialArticles.length === PAGE_SIZE);
  const [isPending, startTransition] = useTransition();

  const loadMore = () => {
    startTransition(async () => {
      const next = await listPublishedArticles({ limit: PAGE_SIZE, offset: articles.length });
      setArticles(prev => [...prev, ...next]);
      setHasMore(next.length === PAGE_SIZE);
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Articles</h1>
          <p className="text-sm text-muted-foreground">Long-form writing from the Perfekthub community.</p>
        </div>

        {user ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/articles/mine">My articles</Link>
            </Button>
            <Button asChild className="gap-1.5">
              <Link href="/articles/compose">
                <Pencil className="size-4" aria-hidden="true" />
                Write
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      {articles.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No articles published yet — be the first to write one.
        </p>
      ) : (
        <div className="space-y-4">
          {articles.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {hasMore ? (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={isPending}>
            {isPending ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
