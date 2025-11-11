// app/search/EmptyState.tsx
import { Search } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-muted/50 rounded-full p-6 mb-4">
        <Search className="w-12 h-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">Start exploring</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        Type a username, name, email, or post content to search across users and
        posts.
      </p>
    </div>
  );
}
