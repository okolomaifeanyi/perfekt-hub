"use client";

import { Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ListSortMode = "time" | "engagement";

export function SortToggle({
  value,
  onChange,
  engagementLabel = "Top",
}: {
  value: ListSortMode;
  onChange: (mode: ListSortMode) => void;
  engagementLabel?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
      <Button
        type="button"
        size="sm"
        variant={value === "time" ? "default" : "ghost"}
        className="h-7 gap-1.5 px-2.5 text-xs"
        onClick={() => onChange("time")}
      >
        <Clock className="size-3.5" />
        Recent
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "engagement" ? "default" : "ghost"}
        className="h-7 gap-1.5 px-2.5 text-xs"
        onClick={() => onChange("engagement")}
      >
        <TrendingUp className="size-3.5" />
        {engagementLabel}
      </Button>
    </div>
  );
}
