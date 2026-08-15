import { Suspense } from "react";
import Link from "next/link";

import NavBar from "../[username]/components/NavBar";
import LoadingSkeleton from "../search/LoadingSkeletion";
import RecommendationRail from "@/components/feed/RecommendationRail";
import SearchResults from "../search/SearchResults";
import { searchUsersAndPosts } from "../search/search";
import { buildDiscoverSections } from "@/lib/discover-surface.mjs";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import { Button } from "@/components/ui/button";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function DiscoverPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const { uid } = await getUserFromSession();
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
          {uid ? (
            <>
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
            </>
          ) : (
            // Every account-scoped rail (saves/events/groups/matches/
            // people/personalized videos) has nothing to show a
            // signed-out visitor — stacking five separate "Sign in to see
            // this" cards back to back read as broken/dead rather than
            // inviting. One combined prompt, plus the one rail that's
            // never actually personalized (Marketplace has no per-user
            // filtering at all).
            <>
              <div className="space-y-2 rounded-xl border bg-card p-6 text-center">
                <h2 className="text-lg font-semibold">See more, personalized to you</h2>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  Sign in to get saved posts, event invites, group
                  recommendations, and matches tailored to your network.
                </p>
                <Button asChild className="mt-1">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
              <RecommendationRail type="products" />
            </>
          )}
        </section>
      </main>
    </>
  );
}

async function SearchResultsServer({ query }: { query: string }) {
  const { users, posts } = await searchUsersAndPosts(query);
  return <SearchResults users={users} posts={posts} query={query} />;
}
