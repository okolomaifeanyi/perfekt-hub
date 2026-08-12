// app/search/LiveSearchInput.tsx
"use client";

import { useDebouncedCallback } from "use-debounce";
import { useEffect, useState } from "react";
import { PostProps, UserProps } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

export default function LiveSearchInput({
  initialQuery,
  onResults,
}: {
  initialQuery: string;
  onResults: (data: { users: UserProps[]; posts: PostProps[] }) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  // Sync with URL
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setQuery(q);
  }, [searchParams]);

  const search = useDebouncedCallback(async (term: string) => {
    if (!term.trim()) {
      onResults({ users: [], posts: [] });
      return;
    }
    const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
    const data = await res.json();
    onResults(data);
  }, 300);

  const updateURL = (val: string) => {
    const params = new URLSearchParams(searchParams);
    if (val) params.set("q", val);
    else params.delete("q");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <Input
      type="search"
      placeholder="Search people, posts, videos, groups, events..."
      value={query}
      onChange={e => {
        const val = e.target.value;
        setQuery(val);
        updateURL(val);
        search(val);
      }}
      className="w-full rounded-md"
      autoFocus
    />
  );
}
