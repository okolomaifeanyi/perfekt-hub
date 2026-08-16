"use client";

import { useEffect, useState, useTransition } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  getNewsFeed,
  getFootballScores,
  getInterestedNews,
  getCountryNews,
  type CuratedContentItem,
} from "@/app/actions/curatedContent";
import { getUserInterests } from "@/app/actions/userInterests";
import { useUserStore } from "@/lib/store/useUserStore";
import { NEWS_CATEGORY_FILTERS } from "@/lib/curated-content-categories.mjs";
import { MatchRow, ContentRow, groupMatches } from "@/components/feed/CuratedContentDisplay";

type UpdatesClientProps = {
  initialScores: CuratedContentItem[];
  initialNews: CuratedContentItem[];
};

const LEAGUE_PREFIX = "league:";
const TOPIC_PREFIX = "topic:";
const TEAM_PREFIX = "team:";
const COUNTRY_PREFIX = "country:";

// Fetched once, client-side, and shared by both panels — page.tsx stays a
// plain ISR page (no cookies() call, so it keeps its 60s revalidate cache
// shared across every visitor) rather than becoming per-user dynamic, and a
// signed-in visitor's interests just refine the view a beat after first
// paint instead of gating it.
function useInterests() {
  const currentUser = useUserStore(state => state.user);
  const [leagueCodes, setLeagueCodes] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    let active = true;
    getUserInterests()
      .then(keys => {
        if (!active) return;
        setLeagueCodes(keys.filter(k => k.startsWith(LEAGUE_PREFIX)).map(k => k.slice(LEAGUE_PREFIX.length)));
        setTopics(keys.filter(k => k.startsWith(TOPIC_PREFIX)).map(k => k.slice(TOPIC_PREFIX.length)));
        // team keys are "team:{id}|{name}" — only the id matters for
        // filtering scores here, unlike Aside which also needs the name.
        setTeamIds(
          keys
            .filter(k => k.startsWith(TEAM_PREFIX))
            .map(k => k.slice(TEAM_PREFIX.length).split("|")[0])
        );
        setCountries(keys.filter(k => k.startsWith(COUNTRY_PREFIX)).map(k => k.slice(COUNTRY_PREFIX.length)));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [currentUser?.uid]);

  return { leagueCodes, topics, teamIds, countries };
}

function ScoresPanel({
  initialScores,
  leagueCodes,
  teamIds,
}: {
  initialScores: CuratedContentItem[];
  leagueCodes: string[];
  teamIds: string[];
}) {
  const [filterToMine, setFilterToMine] = useState(true);
  const [scores, setScores] = useState(initialScores);
  const [isPending, startTransition] = useTransition();
  const hasLeagueInterests = leagueCodes.length > 0;

  useEffect(() => {
    if (!hasLeagueInterests) return;
    startTransition(async () => {
      const items = await getFootballScores(
        filterToMine ? leagueCodes : undefined,
        filterToMine ? teamIds : undefined
      );
      setScores(items);
    });
    // leagueCodes/teamIds are rebuilt fresh from useInterests' state each
    // render — their content (not identity) is what determines refetching.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterToMine, hasLeagueInterests, leagueCodes.join(","), teamIds.join(",")]);

  const { live, upcoming, results } = groupMatches(scores);

  return (
    <div className="space-y-6 px-4">
      {hasLeagueInterests && (
        <div className="flex gap-2">
          {[
            { value: true, label: "My leagues" },
            { value: false, label: "All leagues" },
          ].map(option => (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => setFilterToMine(option.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                filterToMine === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 text-muted-foreground hover:bg-accent/40"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {scores.length === 0 ? (
        <p className={cn("py-10 text-center text-sm text-muted-foreground", isPending && "opacity-60")}>
          No scores yet — check back once the football feed has run.
        </p>
      ) : (
        <div className={cn("space-y-6", isPending && "opacity-60")}>
          {live.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Live now</h3>
              {live.map(match => (
                <MatchRow key={match.id} match={match} />
              ))}
            </section>
          )}

          {upcoming.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Upcoming fixtures</h3>
              {upcoming.map(match => (
                <MatchRow key={match.id} match={match} />
              ))}
            </section>
          )}

          {results.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Recent results</h3>
              {results.map(match => (
                <MatchRow key={match.id} match={match} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function NewsPanel({
  initialNews,
  topics,
  countries,
}: {
  initialNews: CuratedContentItem[];
  topics: string[];
  countries: string[];
}) {
  const hasTopicInterests = topics.length > 0;
  const hasCountryInterests = countries.length > 0;
  const [category, setCategory] = useState("all");
  const [news, setNews] = useState(initialNews);
  const [isPending, startTransition] = useTransition();
  // Interests resolve async (a separate client fetch after first paint —
  // see useInterests), so the "for you"/"near you" default can't just be
  // the useState initializer, which only runs once before that data
  // exists. This tracks whether the visitor has since picked a filter
  // themselves, so the auto-selected default below never clobbers it.
  const [userPicked, setUserPicked] = useState(false);

  const filters = [
    ...(hasTopicInterests ? [{ value: "foryou", label: "For you" }] : []),
    ...(hasCountryInterests ? [{ value: "nearby", label: "Near you" }] : []),
    ...NEWS_CATEGORY_FILTERS,
  ];

  const fetchCategory = (value: string) => {
    startTransition(async () => {
      const items =
        value === "foryou"
          ? await getInterestedNews(topics)
          : value === "nearby" && hasCountryInterests
            ? await getCountryNews(countries)
            : await getNewsFeed(value);
      setNews(items);
    });
  };

  const handleCategoryChange = (value: string) => {
    setUserPicked(true);
    setCategory(value);
    fetchCategory(value);
  };

  // Whichever's most specific to this visitor wins the default view once
  // interests resolve — "for you" if they picked topics, "near you" if just
  // countries, else the same unfiltered "all" every guest already sees.
  useEffect(() => {
    if (userPicked) return;
    const nextDefault = hasTopicInterests ? "foryou" : hasCountryInterests ? "nearby" : "all";
    if (nextDefault === "all") return;
    setCategory(nextDefault);
    fetchCategory(nextDefault);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTopicInterests, hasCountryInterests, userPicked]);

  return (
    <div className="space-y-3 px-4">
      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
        {filters.map(filter => (
          <button
            key={filter.value}
            type="button"
            onClick={() => handleCategoryChange(filter.value)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition",
              category === filter.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/60 text-muted-foreground hover:bg-accent/40"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className={cn("space-y-2 transition-opacity", isPending && "opacity-60")}>
        {news.length === 0 ? (
          <p className="px-1 py-10 text-center text-sm text-muted-foreground">
            Nothing here yet — check back once this category&apos;s feed has run.
          </p>
        ) : (
          news.map(item => <ContentRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

export default function UpdatesClient({ initialScores, initialNews }: UpdatesClientProps) {
  const { leagueCodes, topics, teamIds, countries } = useInterests();

  return (
    <Tabs defaultValue="scores" className="w-full pt-4">
      <TabsList className="sticky top-0 z-20 mb-4 flex w-full justify-center gap-2 bg-background/80 backdrop-blur-sm">
        <TabsTrigger value="scores">Scores</TabsTrigger>
        <TabsTrigger value="news">News</TabsTrigger>
      </TabsList>

      <TabsContent value="scores">
        <ScoresPanel initialScores={initialScores} leagueCodes={leagueCodes} teamIds={teamIds} />
      </TabsContent>

      <TabsContent value="news">
        <NewsPanel initialNews={initialNews} topics={topics} countries={countries} />
      </TabsContent>
    </Tabs>
  );
}
