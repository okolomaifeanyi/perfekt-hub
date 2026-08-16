"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/lib/store/useUserStore";
import { getUserInterests } from "@/app/actions/userInterests";

const LEAGUE_PREFIX = "league:";
const TOPIC_PREFIX = "topic:";
const TEAM_PREFIX = "team:";
const COUNTRY_PREFIX = "country:";

// Shared by Aside, /updates, and Discover's Trends tab — each renders a
// different arrangement of the same curated_content rails/tabs, but all
// three need the same visitor's chosen leagues/topics/teams/countries
// parsed out of the same raw interest-key set.
export function useCuratedInterests() {
  const currentUser = useUserStore(state => state.user);
  const [interests, setInterests] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) {
      setInterests(new Set());
      return;
    }
    let active = true;
    getUserInterests()
      .then(keys => {
        if (active) setInterests(new Set(keys));
      })
      .catch(() => {
        if (active) setInterests(new Set());
      });
    return () => {
      active = false;
    };
  }, [currentUser?.uid]);

  const leagueCodes = [...(interests ?? [])]
    .filter(key => key.startsWith(LEAGUE_PREFIX))
    .map(key => key.slice(LEAGUE_PREFIX.length));
  const topics = [...(interests ?? [])]
    .filter(key => key.startsWith(TOPIC_PREFIX))
    .map(key => key.slice(TOPIC_PREFIX.length));
  // team keys are "team:{id}|{name}" — the name rides along so team-tagged
  // news can fuzzy-match by name without a separate id -> name lookup.
  const teamEntries = [...(interests ?? [])]
    .filter(key => key.startsWith(TEAM_PREFIX))
    .map(key => key.slice(TEAM_PREFIX.length).split("|"));
  const teamIds = teamEntries.map(([id]) => id);
  const teamNames = teamEntries.map(([, name]) => name).filter(Boolean);
  const countries = [...(interests ?? [])]
    .filter(key => key.startsWith(COUNTRY_PREFIX))
    .map(key => key.slice(COUNTRY_PREFIX.length));
  const hasAnyInterest = leagueCodes.length > 0 || topics.length > 0 || countries.length > 0;

  return { interests, leagueCodes, topics, teamIds, teamNames, countries, hasAnyInterest };
}
