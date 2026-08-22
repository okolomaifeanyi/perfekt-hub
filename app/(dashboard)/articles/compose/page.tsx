import { getArticleForEdit } from "@/app/actions/articles";
import ComposeArticleClient from "./ComposeArticleClient";

// Not in lib/public-routes.mjs's isPublicPath, so proxy.ts's middleware
// already redirects a signed-out visitor to /login before this ever
// renders — no server-side auth check needed here on top of that.
export const metadata = {
  title: "Write an Article",
};

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function ComposeArticlePage({ searchParams }: PageProps) {
  const { id } = await searchParams;
  // getArticleForEdit is author-scoped — if `id` belongs to someone else
  // (or doesn't exist), this resolves to null and the form just starts
  // blank instead of leaking another author's draft into the form fields.
  const initialArticle = id ? await getArticleForEdit(id) : null;

  return <ComposeArticleClient initialArticle={initialArticle} />;
}
