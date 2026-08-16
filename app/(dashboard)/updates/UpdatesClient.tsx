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
import { useCuratedInterests } from "@/hooks/useCuratedInterests";
import { NEWS_CATEGORY_FILTERS } from "@/lib/curated-content-categories.mjs";
import { MatchRow, ContentRow, groupMatches } from "@/components/feed/CuratedContentDisplay";

type UpdatesClientProps = {
  initialScores: CuratedContentItem[];
  initialNews: CuratedContentItem[];
};

// Shared by all three football tabs below — one fetch of the full mixed
// (fixture + live + result) list, filtered client-side per tab by category,
// so switching tabs never re-fetches and the "My leagues" toggle stays in
// sync across all three instead of each tab tracking it separately.
function useScores(initialScores: CuratedContentItem[], leagueCodes: string[], teamIds: string[]) {
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

  return { scores, filterToMine, setFilterToMine, hasLeagueInterests, isPending };
}

function LeagueFilterToggle({
  filterToMine,
  setFilterToMine,
}: {
  filterToMine: boolean;
  setFilterToMine: (value: boolean) => void;
}) {
  return (
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
  );
}

function MatchesList({
  matches,
  emptyMessage,
  isPending,
  hasLeagueInterests,
  filterToMine,
  setFilterToMine,
}: {
  matches: CuratedContentItem[];
  emptyMessage: string;
  isPending: boolean;
  hasLeagueInterests: boolean;
  filterToMine: boolean;
  setFilterToMine: (value: boolean) => void;
}) {
  return (
    <div className="space-y-4 px-4">
      {hasLeagueInterests && (
        <LeagueFilterToggle filterToMine={filterToMine} setFilterToMine={setFilterToMine} />
      )}

      {matches.length === 0 ? (
        <p className={cn("py-10 text-center text-sm text-muted-foreground", isPending && "opacity-60")}>
          {emptyMessage}
        </p>
      ) : (
        <div className={cn("space-y-2", isPending && "opacity-60")}>
          {matches.map(match => (
            <MatchRow key={match.id} match={match} />
          ))}
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
  const { leagueCodes, topics, teamIds, countries } = useCuratedInterests();
  const { scores, filterToMine, setFilterToMine, hasLeagueInterests, isPending } = useScores(
    initialScores,
    leagueCodes,
    teamIds
  );
  const { live, upcoming, results } = groupMatches(scores);

  return (
    <Tabs defaultValue="fixtures" className="w-full pt-4">
      <TabsList className="sticky top-0 z-20 mb-4 flex w-full justify-center gap-2 bg-background/80 backdrop-blur-sm">
        <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
        <TabsTrigger value="live">Live</TabsTrigger>
        <TabsTrigger value="results">Results</TabsTrigger>
        <TabsTrigger value="news">News</TabsTrigger>
      </TabsList>

      <TabsContent value="fixtures">
        <MatchesList
          matches={upcoming}
          emptyMessage="No upcoming fixtures — check back once the football feed has run."
          isPending={isPending}
          hasLeagueInterests={hasLeagueInterests}
          filterToMine={filterToMine}
          setFilterToMine={setFilterToMine}
        />
      </TabsContent>

      <TabsContent value="live">
        <MatchesList
          matches={live}
          emptyMessage="Nothing live right now — check back once a match kicks off."
          isPending={isPending}
          hasLeagueInterests={hasLeagueInterests}
          filterToMine={filterToMine}
          setFilterToMine={setFilterToMine}
        />
      </TabsContent>

      <TabsContent value="results">
        <MatchesList
          matches={results}
          emptyMessage="No recent results yet — check back once a match finishes."
          isPending={isPending}
          hasLeagueInterests={hasLeagueInterests}
          filterToMine={filterToMine}
          setFilterToMine={setFilterToMine}
        />
      </TabsContent>

      <TabsContent value="news">
        <NewsPanel initialNews={initialNews} topics={topics} countries={countries} />
      </TabsContent>
    </Tabs>
  );
}
