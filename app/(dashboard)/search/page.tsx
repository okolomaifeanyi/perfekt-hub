// app/search/page.tsx
// import { Input } from "@/components/ui/input";
import NavBar from "../[username]/components/NavBar";
import SearchResults from "./SearchResults";
// import EmptyState from "./EmptyState";
import { Suspense } from "react";
import LoadingSkeleton from "./LoadingSkeletion";

type Props = {
  searchParams: Promise<{ q?: string }>; // ← Now a Promise!
};

export default async function SearchPage({ searchParams }: Props) {
  // ← Await the searchParams
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  return (
    <>
      <NavBar
        title="Search"
        // extra={
        //   <form action="/search" method="GET" className="flex-1 max-w-md mx-2">
        //     <Input
        //       name="q"
        //       type="search"
        //       placeholder="Search users or posts..."
        //       defaultValue={query}
        //       autoFocus
        //       className="w-full"
        //     />
        //   </form>
        // }
      />

      <main className="container mx-auto px-4 py-6">
        <Suspense fallback={<LoadingSkeleton />}>
          <SearchResultsServer query={query} />
        </Suspense>
      </main>
    </>
  );
}

/* --------------------------------------------------------------- */
/* Server-only data fetch – streams results to the client component */
/* --------------------------------------------------------------- */
async function SearchResultsServer({ query }: { query: string }) {
  // if (!query) return <EmptyState />;

  const { searchUsersAndPosts } = await import("./search");
  const { users, posts } = await searchUsersAndPosts(query);

  return <SearchResults users={users} posts={posts} query={query} />;
}
