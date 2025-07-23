import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCard } from "./SkeletonCard";

export function PostSkeleton() {
  return (
    <Card className="p-2 rounded-none w-full">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-[64px] w-[64px] rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-22" />
            <Skeleton className="h-4 w-14" />
          </div>
        </div>

        <Skeleton className="h-8 w-14" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-14" />
      </div>

      <SkeletonCard />

      <div className="mx-auto">
        <Skeleton className="h-6 w-[50px]" />
      </div>
    </Card>
  );
}
