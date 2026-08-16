import { Suspense } from "react";

import NavBar from "../[username]/components/NavBar";
import LoadingSkeleton from "../search/LoadingSkeletion";
import SearchResults from "../search/SearchResults";
import { searchUsersAndPosts } from "../search/search";
import DiscoverTrends from "./DiscoverTrends";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function DiscoverPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  return (
    <>
      <NavBar title="Discover" />

      <main className="container mx-auto px-4 py-6 space-y-8">
        <section className="space-y-3">
          <div>
            <h1 className="text-3xl font-semibold">Discover</h1>
            <p className="text-sm text-muted-foreground">
              Search people, posts, videos, groups, and events across Perfekthub.
            </p>
          </div>

          <Suspense fallback={<LoadingSkeleton />}>
            <SearchResultsServer query={query} />
          </Suspense>
        </section>
      </main>
    </>
  );
}

async function SearchResultsServer({ query }: { query: string }) {
  const { users, posts } = await searchUsersAndPosts(query);
  return <SearchResults users={users} posts={posts} query={query} trends={<DiscoverTrends />} />;
}
