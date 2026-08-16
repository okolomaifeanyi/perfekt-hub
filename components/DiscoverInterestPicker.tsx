"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { addUserInterest, removeUserInterest } from "@/app/actions/userInterests";
import { FOOTBALL_LEAGUES, NEWS_CATEGORY_FILTERS } from "@/lib/curated-content-categories.mjs";
import { useUserStore } from "@/lib/store/useUserStore";

const LEAGUE_PREFIX = "league:";
const TOPIC_PREFIX = "topic:";
const TOPICS = NEWS_CATEGORY_FILTERS.filter(f => f.value !== "all");

function InterestChip({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-50",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/60 text-muted-foreground hover:bg-accent/40"
      )}
    >
      {label}
    </button>
  );
}

// A right-there-on-the-page tick list for the two interest namespaces most
// visitors want fastest (leagues, topics) — teams and countries stay
// Settings-only since picking those meaningfully (a specific team out of a
// league's whole roster, one country out of 37) needs more room than an
// inline strip on Discover has to spare.
export function DiscoverInterestPicker({
  interests,
  onChanged,
}: {
  interests: Set<string>;
  onChanged: () => void;
}) {
  const currentUser = useUserStore(state => state.user);
  const [saving, setSaving] = useState<string | null>(null);

  const toggle = async (key: string) => {
    if (!currentUser) {
      toast.error("Sign in to pick interests");
      return;
    }
    const active = interests.has(key);
    setSaving(key);
    try {
      await (active ? removeUserInterest(key) : addUserInterest(key));
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save interest");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Leagues</p>
        <div className="flex flex-wrap gap-1.5">
          {FOOTBALL_LEAGUES.map(league => {
            const key = `${LEAGUE_PREFIX}${league.code}`;
            return (
              <InterestChip
                key={key}
                label={league.name}
                active={interests.has(key)}
                disabled={saving === key}
                onClick={() => toggle(key)}
              />
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Topics</p>
        <div className="flex flex-wrap gap-1.5">
          {TOPICS.map(topic => {
            const key = `${TOPIC_PREFIX}${topic.value}`;
            return (
              <InterestChip
                key={key}
                label={topic.label}
                active={interests.has(key)}
                disabled={saving === key}
                onClick={() => toggle(key)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
