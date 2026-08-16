"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, MapPin, Newspaper, Trophy } from "lucide-react";
import { ToggleRow } from "@/components/settings/ToggleRow";
import { useUserStore } from "@/lib/store/useUserStore";
import { getUserInterests, addUserInterest, removeUserInterest } from "@/app/actions/userInterests";
import { FOOTBALL_LEAGUES, NEWS_CATEGORY_FILTERS } from "@/lib/curated-content-categories.mjs";

const TOPICS = NEWS_CATEGORY_FILTERS.filter(f => f.value !== "all");
const COUNTRY_NEWS_KEY = "topic:country_news";

export function InterestsSettingsClient() {
  const country = useUserStore(state => state.user?.country);
  const [interests, setInterests] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getUserInterests()
      .then(keys => {
        if (active) setInterests(new Set(keys));
      })
      .catch(err => console.error("getUserInterests failed:", err));
    return () => {
      active = false;
    };
  }, []);

  const handleToggle = async (key: string, checked: boolean) => {
    if (!interests) return;
    const previous = interests;
    const next = new Set(previous);
    if (checked) {
      next.add(key);
    } else {
      next.delete(key);
    }
    setInterests(next);
    setSaving(key);
    try {
      await (checked ? addUserInterest(key) : removeUserInterest(key));
    } catch (err) {
      setInterests(previous);
      toast.error(err instanceof Error ? err.message : "Failed to save interest");
    } finally {
      setSaving(null);
    }
  };

  if (!interests) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Pick what you want to see in the sidebar and on{" "}
        <Link href="/updates" className="text-primary hover:underline">
          Scores &amp; News
        </Link>
        . Nothing selected means those widgets just stay out of your way.
      </p>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
          <Trophy className="size-4" />
          Sports leagues
        </h2>
        <p className="mb-2 text-xs text-muted-foreground">Fixtures, live scores, and results.</p>

        <div className="divide-y">
          {FOOTBALL_LEAGUES.map(league => {
            const key = `league:${league.code}`;
            return (
              <ToggleRow
                key={key}
                id={key}
                label={league.name}
                checked={interests.has(key)}
                disabled={saving === key}
                onChange={value => handleToggle(key, value)}
              />
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
          <Newspaper className="size-4" />
          Topics
        </h2>
        <p className="mb-2 text-xs text-muted-foreground">Crypto, movies, tech, and everything else.</p>

        <div className="divide-y">
          {TOPICS.map(topic => {
            const key = `topic:${topic.value}`;
            return (
              <ToggleRow
                key={key}
                id={key}
                label={topic.label}
                checked={interests.has(key)}
                disabled={saving === key}
                onChange={value => handleToggle(key, value)}
              />
            );
          })}

          <ToggleRow
            id={COUNTRY_NEWS_KEY}
            label="News near you"
            description={
              country
                ? `Filtered to ${country}.`
                : "Set your country on your profile to turn this on."
            }
            checked={interests.has(COUNTRY_NEWS_KEY)}
            disabled={!country || saving === COUNTRY_NEWS_KEY}
            onChange={value => handleToggle(COUNTRY_NEWS_KEY, value)}
          />
        </div>
      </section>

      {!country && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0" />
          No country set on your profile yet — add one from Edit Profile to unlock local news.
        </p>
      )}
    </div>
  );
}
