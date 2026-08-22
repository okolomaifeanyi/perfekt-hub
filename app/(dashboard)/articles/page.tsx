import { listPublishedArticles } from "@/app/actions/articles";
import ArticlesFeedClient from "./ArticlesFeedClient";

// Articles are hand-written and change far less often than /updates' live
// scores — a longer window keeps the listing reasonably fresh without
// hitting the database on every single page load.
export const revalidate = 300;

export const metadata = {
  title: "Articles",
  description: "Long-form articles written by the Perfekthub community.",
};

export default async function ArticlesPage() {
  const articles = await listPublishedArticles({ limit: 20, offset: 0 });
  return <ArticlesFeedClient initialArticles={articles} />;
}
