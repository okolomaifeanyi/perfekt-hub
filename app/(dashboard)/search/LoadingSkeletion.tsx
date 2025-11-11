// app/search/LoadingSkeleton.tsx
export default function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Users */}
      <section>
        <div className="h-7 w-32 bg-muted rounded mb-3" />
        <div className="grid gap-3 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg"
            >
              <div className="w-12 h-12 bg-muted rounded-full" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted rounded w-32" />
                <div className="h-3 bg-muted rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Posts */}
      <section>
        <div className="h-7 w-32 bg-muted rounded mb-3" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="h-3 bg-muted rounded w-20" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
