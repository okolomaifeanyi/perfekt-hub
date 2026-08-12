"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PostCardSkeleton = () => {
  return (
    <Card className="cursor-pointer transition hover:bg-background/60 backdrop-blur-lg py-4">
      <CardContent className="space-y-3 px-0">
        {/* Header */}
        <div className="flex justify-between items-center px-4">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        {/* Text */}
        <div className="px-4 space-y-2">
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-full max-w-xs" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Media */}
        <div className="px-4">
          <Skeleton className="aspect-video w-full max-w-lg rounded-xl" />
        </div>

        {/* Reactions */}
        <div className="px-4 mt-4 flex gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-5 w-16" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PostCardSkeleton;
