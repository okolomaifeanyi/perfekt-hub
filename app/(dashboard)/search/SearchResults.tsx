// app/search/SearchResults.tsx
"use client";

import { User, FileText } from "lucide-react";
import { PostProps, UserProps } from "@/lib/types";
import LiveSearchInput from "./LiveSearchInput";
import { useState, useTransition } from "react";
import EmptyState from "./EmptyState"; // ← Add this
import PostCard from "../[username]/[postId]/components/PostCard";
import FollowCard from "@/components/FollowCard";
import LoadingSkeleton from "./LoadingSkeletion";

type SearchResultsProps = {
  users: UserProps[];
  posts: PostProps[];
  query: string;
};

export default function SearchResults({
  users,
  posts,
  query,
}: SearchResultsProps) {
  const [liveUsers, setLiveUsers] = useState(users);
  const [livePosts, setLivePosts] = useState(posts);
  const [isPending, startTransition] = useTransition();

  const hasQuery = query.trim().length > 0;
  // const hasLiveQuery = liveUsers.length > 0 || livePosts.length > 0;

  return (
    <div className="space-y-8">
      <LiveSearchInput
        initialQuery={query}
        onResults={({ users, posts }) => {
          startTransition(() => {
            setLiveUsers(users);
            setLivePosts(posts);
          });
        }}
      />

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
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <User className="w-5 h-5" /> Users
              {liveUsers.length > 0 && ` (${liveUsers.length})`}
            </h2>
            {liveUsers.length === 0 ? (
              <p className="text-muted-foreground">No users found.</p>
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
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" /> Posts
              {livePosts.length > 0 && ` (${livePosts.length})`}
            </h2>
            {livePosts.length === 0 ? (
              <p className="text-muted-foreground">No posts found.</p>
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
    </div>
  );
}
