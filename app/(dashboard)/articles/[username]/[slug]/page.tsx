import { notFound } from "next/navigation";
import { getArticleBySlug, incrementArticleView } from "@/app/actions/articles";
import { deriveExcerpt } from "@/lib/articles.mjs";
import ArticleDetailClient from "./ArticleDetailClient";

type PageProps = {
  params: Promise<{ username: string; slug: string }>;
};

// A view only counts once someone actually loads this page (mirrors
// app/(dashboard)/updates/[id]/page.tsx's ContentDetailPage), and this page
// also needs to reflect an edit immediately (no stale ISR snapshot) since
// the author can come straight here right after saving changes.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { username, slug } = await params;
  const article = await getArticleBySlug(username, slug);
  if (!article) return {};

  const description = article.excerpt || deriveExcerpt(article.body);

  return {
    title: article.title,
    description,
    openGraph: {
      title: article.title,
      description,
      images: article.coverImageUrl ? [{ url: article.coverImageUrl }] : [],
    },
  };
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { username, slug } = await params;
  // getArticleBySlug is RLS-backed: a signed-out visitor or a different
  // user gets null for someone else's draft, the author gets the real row
  // — see the migration's articles_read_published_or_own policy.
  const article = await getArticleBySlug(username, slug);
  if (!article) return notFound();

  if (article.status === "published") {
    await incrementArticleView(article.id);
  }

  return <ArticleDetailClient article={article} />;
}
