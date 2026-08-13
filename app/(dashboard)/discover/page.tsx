import { Suspense } from "react";

import NavBar from "../[username]/components/NavBar";
import LoadingSkeleton from "../search/LoadingSkeletion";
import RecommendationRail from "@/components/feed/RecommendationRail";
import SearchResults from "../search/SearchResults";
import { searchUsersAndPosts } from "../search/search";
import { buildDiscoverSections } from "@/lib/discover-surface.mjs";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function DiscoverPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const sections = buildDiscoverSections({
    savedCount: 1,
    eventCount: 1,
    groupCount: 1,
    peopleCount: 1,
  });
  const railTypeMap: Record<
    (typeof sections)[number]["type"],
    "saves" | "events" | "groups" | "follows"
  > = {
    saves: "saves",
    events: "events",
    groups: "groups",
    people: "follows",
  };

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

        <section className="space-y-4">
          {sections.map(section => (
            <RecommendationRail
              key={section.type}
              type={railTypeMap[section.type]}
            />
          ))}
          <RecommendationRail type="matches" />
          <RecommendationRail type="products" />
          <RecommendationRail type="videos" />
          <RecommendationRail type="friends" />
        </section>
      </main>
    </>
  );
}

async function SearchResultsServer({ query }: { query: string }) {
  const { users, posts } = await searchUsersAndPosts(query);
  return <SearchResults users={users} posts={posts} query={query} />;
}
