import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="w-full">
      <Skeleton className="h-48 w-full rounded-none sm:h-64" />

      <div className="px-4">
        <Skeleton className="-mt-12 size-24 rounded-full border-4 border-background sm:size-32" />

        <div className="mt-4 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-3/4 max-w-sm" />
        </div>

        <div className="mt-4 flex gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-5 w-20" />
          ))}
        </div>
      </div>
    </div>
  );
}
