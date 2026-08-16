// app/search/SearchResults.tsx
"use client";

import { User, FileText } from "lucide-react";
import { PostProps, UserProps } from "@/lib/types";
import LiveSearchInput from "./LiveSearchInput";
import { useState, useTransition, type ReactNode } from "react";
import EmptyState from "./EmptyState"; // ← Add this
import PostCard from "../[username]/[postId]/components/PostCard";
import FollowCard from "@/components/FollowCard";
import LoadingSkeleton from "./LoadingSkeletion";
import { H2, P } from "@/components/Typography";

type SearchResultsProps = {
  users: UserProps[];
  posts: PostProps[];
  query: string;
  // Rendered as a sibling below the results, inside the same container the
  // sticky search bar lives in — position: sticky only holds while its own
  // parent box is still in view, so this has to share that parent rather
  // than sit in a separate, much shorter section next door (confirmed live:
  // the search bar unstuck and scrolled away as soon as the short "just
  // search" section it was actually bounded by ended).
  trends?: ReactNode;
};

export default function SearchResults({
  users,
  posts,
  query,
  trends,
}: SearchResultsProps) {
  const [liveUsers, setLiveUsers] = useState(users);
  const [livePosts, setLivePosts] = useState(posts);
  const [isPending, startTransition] = useTransition();

  const hasQuery = query.trim().length > 0;
  // const hasLiveQuery = liveUsers.length > 0 || livePosts.length > 0;

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-20 -mx-4 bg-background/80 px-4 py-2 backdrop-blur-sm">
        <LiveSearchInput
          initialQuery={query}
          onResults={({ users, posts }) => {
            startTransition(() => {
              setLiveUsers(users);
              setLivePosts(posts);
            });
          }}
        />
      </div>

      {/* Loading */}
      {isPending ? (
        <LoadingSkeleton />
      ) : !hasQuery ? (
        // No input → show friendly EmptyState
        <EmptyState />
      ) : (
        // Has input → show results or "no results"
        <>
          {/* Users */}
          <section>
            <H2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <User className="w-5 h-5" /> Users
              {liveUsers.length > 0 && ` (${liveUsers.length})`}
            </H2>
            {liveUsers.length === 0 ? (
              <P className="text-muted-foreground">No users found.</P>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {liveUsers.map(user => (
                  <FollowCard user={user} key={user.uid} />
                ))}
              </div>
            )}
          </section>

          {/* Posts */}
          <section>
            <H2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" /> Posts
              {livePosts.length > 0 && ` (${livePosts.length})`}
            </H2>
            {livePosts.length === 0 ? (
              <P className="text-muted-foreground">No posts found.</P>
            ) : (
              <div className="space-y-3">
                {livePosts.map(post => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {trends}
    </div>
  );
}
