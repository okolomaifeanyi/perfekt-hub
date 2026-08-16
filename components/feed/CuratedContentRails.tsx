"use client";

import { useEffect, useState } from "react";
import { Clapperboard, Newspaper, Target, Trophy } from "lucide-react";
import { RailShell, ListRow, RowSkeleton, EmptyRow } from "@/components/feed/RecommendationRail";
import { ContentRow } from "@/components/feed/CuratedContentDisplay";
import {
  getFootballScores,
  getBettingPredictions,
  getInterestedNews,
  getCountryNews,
  getTeamNews,
  getNewsFeed,
  type CuratedContentItem,
} from "@/app/actions/curatedContent";

type FootballMetadata = {
  competition?: string;
  homeTeam?: { name?: string | null; shortName?: string | null; crest?: string | null };
  awayTeam?: { name?: string | null; shortName?: string | null; crest?: string | null };
  score?: { home: number; away: number } | null;
};

function FootballRow({ match }: { match: CuratedContentItem }) {
  const meta = match.metadata as FootballMetadata;
  const home = meta.homeTeam?.shortName || meta.homeTeam?.name || "Home";
  const away = meta.awayTeam?.shortName || meta.awayTeam?.name || "Away";
  const hasScore = typeof meta.score?.home === "number" && typeof meta.score?.away === "number";
  const title = hasScore ? `${home} ${meta.score!.home}-${meta.score!.away} ${away}` : `${home} vs ${away}`;
  const subtitle = match.category === "football_live" ? `${meta.competition} · Live now` : meta.competition;

  return (
    <ListRow
      href="/updates"
      avatarSrc={meta.homeTeam?.crest ?? undefined}
      avatarFallback={home}
      title={title}
      subtitle={subtitle}
    />
  );
}

// A match moving from fixture -> live -> result changes its category and
// published_at meaning (kickoff time vs. result time) — prioritizing live,
// then soonest-upcoming, then most-recent-result keeps the two-item preview
// showing whatever's most relevant right now rather than just "newest row".
function prioritizeMatches(matches: CuratedContentItem[]): CuratedContentItem[] {
  const live = matches.filter(m => m.category === "football_live");
  const upcoming = [...matches.filter(m => m.category === "football_fixture")].sort(
    (a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
  );
  const results = matches.filter(m => m.category === "football_result");
  return [...live, ...upcoming, ...results];
}

export function FootballRail({
  leagueCodes,
  teamIds,
  previewCount = 2,
}: {
  leagueCodes: string[];
  teamIds?: string[];
  previewCount?: number;
}) {
  const [matches, setMatches] = useState<CuratedContentItem[] | null>(null);
  const leagueKey = leagueCodes.join(",");
  const teamKey = (teamIds ?? []).join(",");

  useEffect(() => {
    let active = true;
    getFootballScores(leagueCodes, teamIds)
      .then(result => {
        if (active) setMatches(prioritizeMatches(result));
      })
      .catch(() => {
        if (active) setMatches([]);
      });
    return () => {
      active = false;
    };
    // leagueCodes/teamIds are rebuilt fresh each render from the interests
    // set — leagueKey/teamKey are the stable dependencies that actually
    // reflect their content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueKey, teamKey]);

  return (
    <RailShell title="Scores" description="Fixtures, live scores, and results." icon={Trophy} seeMoreHref="/updates">
      {matches === null ? (
        Array.from({ length: previewCount }).map((_, index) => <RowSkeleton key={index} />)
      ) : matches.length === 0 ? (
        <EmptyRow label="No matches right now." />
      ) : (
        matches.slice(0, previewCount).map(match => <FootballRow key={match.id} match={match} />)
      )}
    </RailShell>
  );
}

type BettingMetadata = {
  league?: string;
  homeTeam?: string;
  awayTeam?: string;
  predictedWinner?: string;
};

function BettingRow({ item }: { item: CuratedContentItem }) {
  const meta = item.metadata as BettingMetadata;
  return (
    <ListRow
      href="/updates"
      avatarFallback={meta.homeTeam || item.title}
      title={item.title}
      subtitle={meta.predictedWinner ? `Predicted: ${meta.predictedWinner}` : meta.league}
    />
  );
}

// Scoped to the visitor's chosen leagues, same as FootballRail — a betting
// pick for a league they never picked isn't "for you" any more than a score
// from it would be.
export function BettingRail({
  leagueCodes,
  previewCount = 2,
}: {
  leagueCodes: string[];
  previewCount?: number;
}) {
  const [items, setItems] = useState<CuratedContentItem[] | null>(null);
  const leagueKey = leagueCodes.join(",");

  useEffect(() => {
    let active = true;
    getBettingPredictions(leagueCodes, previewCount)
      .then(result => {
        if (active) setItems(result);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueKey, previewCount]);

  return (
    <RailShell title="Betting" description="Predicted outcomes for your leagues." icon={Target} seeMoreHref="/updates">
      {items === null ? (
        Array.from({ length: previewCount }).map((_, index) => <RowSkeleton key={index} />)
      ) : items.length === 0 ? (
        <EmptyRow label="No predictions right now." />
      ) : (
        items.slice(0, previewCount).map(item => <BettingRow key={item.id} item={item} />)
      )}
    </RailShell>
  );
}

export function MoviesRail({ previewCount = 2 }: { previewCount?: number }) {
  const [items, setItems] = useState<CuratedContentItem[] | null>(null);

  useEffect(() => {
    let active = true;
    getNewsFeed("movie_news", previewCount)
      .then(result => {
        if (active) setItems(result);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, [previewCount]);

  return (
    <RailShell title="Movies" description="Trending in film right now." icon={Clapperboard} seeMoreHref="/updates">
      {items === null ? (
        Array.from({ length: previewCount }).map((_, index) => <RowSkeleton key={index} />)
      ) : items.length === 0 ? (
        <EmptyRow label="Nothing new yet." />
      ) : (
        items.slice(0, previewCount).map(item => <ContentRow key={item.id} item={item} />)
      )}
    </RailShell>
  );
}

export function NewsForYouRail({ topics, previewCount = 2 }: { topics: string[]; previewCount?: number }) {
  const [items, setItems] = useState<CuratedContentItem[] | null>(null);
  const topicsKey = topics.join(",");

  useEffect(() => {
    let active = true;
    getInterestedNews(topics, previewCount)
      .then(result => {
        if (active) setItems(result);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicsKey, previewCount]);

  return (
    <RailShell title="News for you" description="From the topics you picked." icon={Newspaper} seeMoreHref="/updates">
      {items === null ? (
        Array.from({ length: previewCount }).map((_, index) => <RowSkeleton key={index} />)
      ) : items.length === 0 ? (
        <EmptyRow label="Nothing new yet." />
      ) : (
        items.slice(0, previewCount).map(item => <ContentRow key={item.id} item={item} />)
      )}
    </RailShell>
  );
}

export function CountryNewsRail({ countries, previewCount = 2 }: { countries: string[]; previewCount?: number }) {
  const [items, setItems] = useState<CuratedContentItem[] | null>(null);
  const countriesKey = countries.join(",");

  useEffect(() => {
    let active = true;
    getCountryNews(countries, previewCount)
      .then(result => {
        if (active) setItems(result);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countriesKey, previewCount]);

  return (
    <RailShell
      title="News near you"
      description={`What's happening in ${countries.join(", ")}.`}
      icon={Newspaper}
      seeMoreHref="/updates"
    >
      {items === null ? (
        Array.from({ length: previewCount }).map((_, index) => <RowSkeleton key={index} />)
      ) : items.length === 0 ? (
        <EmptyRow label="Nothing local yet — check back soon." />
      ) : (
        items.slice(0, previewCount).map(item => <ContentRow key={item.id} item={item} />)
      )}
    </RailShell>
  );
}

export function TeamNewsRail({ teamNames, previewCount = 2 }: { teamNames: string[]; previewCount?: number }) {
  const [items, setItems] = useState<CuratedContentItem[] | null>(null);
  const teamNamesKey = teamNames.join(",");

  useEffect(() => {
    let active = true;
    getTeamNews(teamNames, previewCount)
      .then(result => {
        if (active) setItems(result);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamNamesKey, previewCount]);

  return (
    <RailShell title="Your teams" description="News mentioning the teams you follow." icon={Trophy} seeMoreHref="/updates">
      {items === null ? (
        Array.from({ length: previewCount }).map((_, index) => <RowSkeleton key={index} />)
      ) : items.length === 0 ? (
        <EmptyRow label="Nothing yet — check back soon." />
      ) : (
        items.slice(0, previewCount).map(item => <ContentRow key={item.id} item={item} />)
      )}
    </RailShell>
  );
}
