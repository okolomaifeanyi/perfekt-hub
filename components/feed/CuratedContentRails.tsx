"use client";

import { useEffect, useState } from "react";
import { Clapperboard, Newspaper, Trophy } from "lucide-react";
import { RailShell, ListRow, RowSkeleton, EmptyRow } from "@/components/feed/RecommendationRail";
import {
  getFootballScores,
  getInterestedNews,
  getCountryNews,
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

function ContentRow({ item }: { item: CuratedContentItem }) {
  return (
    <ListRow
      href={item.source_url || "/updates"}
      avatarSrc={item.image_url ?? undefined}
      avatarFallback={item.title}
      title={item.title}
      subtitle={item.source_name}
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

export function FootballRail({ leagueCodes, previewCount = 2 }: { leagueCodes: string[]; previewCount?: number }) {
  const [matches, setMatches] = useState<CuratedContentItem[] | null>(null);
  const leagueKey = leagueCodes.join(",");

  useEffect(() => {
    let active = true;
    getFootballScores(leagueCodes)
      .then(result => {
        if (active) setMatches(prioritizeMatches(result));
      })
      .catch(() => {
        if (active) setMatches([]);
      });
    return () => {
      active = false;
    };
    // leagueCodes is rebuilt fresh each render from the interests set —
    // leagueKey is the stable dependency that actually reflects its content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueKey]);

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

export function CountryNewsRail({ country, previewCount = 2 }: { country: string; previewCount?: number }) {
  const [items, setItems] = useState<CuratedContentItem[] | null>(null);

  useEffect(() => {
    let active = true;
    getCountryNews(country, previewCount)
      .then(result => {
        if (active) setItems(result);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, [country, previewCount]);

  return (
    <RailShell
      title="News near you"
      description={`What's happening in ${country}.`}
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
