import PostCardSkeleton from "./components/PostCardSkeleton";

export default function Loading() {
  return (
    <div className="space-y-4 pb-4 w-full mx-auto">
      <div className="px-2 space-y-4">
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </div>
  );
}
