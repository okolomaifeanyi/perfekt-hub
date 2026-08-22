import { listMyArticles } from "@/app/actions/articles";
import MyArticlesClient from "./MyArticlesClient";

// Not in lib/public-routes.mjs's isPublicPath, so proxy.ts's middleware
// already redirects a signed-out visitor to /login before this ever
// renders — listMyArticles below can safely assume a session exists.
export const metadata = {
  title: "My Articles",
};

export default async function MyArticlesPage() {
  const articles = await listMyArticles();
  return <MyArticlesClient initialArticles={articles} />;
}
