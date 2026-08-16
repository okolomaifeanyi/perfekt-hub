"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Newspaper, Shirt, Trophy, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleRow } from "@/components/settings/ToggleRow";
import { getUserInterests, addUserInterest, removeUserInterest } from "@/app/actions/userInterests";
import { getTeamsForLeague, type TeamOption } from "@/app/actions/curatedContent";
import { FOOTBALL_LEAGUES, NEWS_CATEGORY_FILTERS } from "@/lib/curated-content-categories.mjs";
import { COUNTRIES } from "@/lib/countries.mjs";

const TOPICS = NEWS_CATEGORY_FILTERS.filter(f => f.value !== "all");
const TEAM_PREFIX = "team:";
const COUNTRY_PREFIX = "country:";

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

// Team rosters are league-scoped, so this only renders once its league is
// actually selected — fetches lazily rather than loading all five leagues'
// teams up front for a section most visitors will only expand for one or two.
function LeagueTeams({
  leagueCode,
  leagueName,
  interests,
  saving,
  onToggleTeam,
}: {
  leagueCode: string;
  leagueName: string;
  interests: Set<string>;
  saving: string | null;
  onToggleTeam: (id: string, name: string, checked: boolean) => void;
}) {
  const [teams, setTeams] = useState<TeamOption[] | null>(null);

  useEffect(() => {
    let active = true;
    getTeamsForLeague(leagueCode)
      .then(result => {
        if (active) setTeams(result);
      })
      .catch(() => {
        if (active) setTeams([]);
      });
    return () => {
      active = false;
    };
  }, [leagueCode]);

  if (teams === null) {
    return <p className="text-xs text-muted-foreground">Loading {leagueName} teams…</p>;
  }
  if (teams.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{leagueName}</p>
      <div className="flex flex-wrap gap-1.5">
        {teams.map(team => {
          const key = `${TEAM_PREFIX}${team.id}|${team.name}`;
          const active = interests.has(key);
          return (
            <InterestChip
              key={team.id}
              label={team.shortName || team.name}
              active={active}
              disabled={saving === key}
              onClick={() => onToggleTeam(team.id, team.name, !active)}
            />
          );
        })}
      </div>
    </div>
  );
}

export function InterestsSettingsClient() {
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

  const handleToggleTeam = (id: string, name: string, checked: boolean) => {
    const key = `${TEAM_PREFIX}${id}|${name}`;
    // A team switching leagues (rare, but the key embeds the name) could
    // otherwise leave a stale duplicate under the old name — clear any
    // other key for the same id first.
    if (checked && interests) {
      const stale = [...interests].find(k => k.startsWith(`${TEAM_PREFIX}${id}|`) && k !== key);
      if (stale) void handleToggle(stale, false);
    }
    void handleToggle(key, checked);
  };

  if (!interests) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedLeagues = FOOTBALL_LEAGUES.filter(league => interests.has(`league:${league.code}`));

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

      {selectedLeagues.length > 0 && (
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
            <Shirt className="size-4" />
            Favorite teams
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Narrows Scores to just these teams&apos; matches instead of the whole league.
          </p>

          <div className="space-y-3">
            {selectedLeagues.map(league => (
              <LeagueTeams
                key={league.code}
                leagueCode={league.code}
                leagueName={league.name}
                interests={interests}
                saving={saving}
                onToggleTeam={handleToggleTeam}
              />
            ))}
          </div>
        </section>
      )}

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
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
          <Globe2 className="size-4" />
          Countries
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Pick as many as you like — not just where you&apos;re from.
        </p>

        <div className="flex flex-wrap gap-1.5">
          {COUNTRIES.map(country => {
            const key = `${COUNTRY_PREFIX}${country.name}`;
            const active = interests.has(key);
            return (
              <InterestChip
                key={country.code}
                label={country.name}
                active={active}
                disabled={saving === key}
                onClick={() => handleToggle(key, !active)}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
