"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  getFootballScores,
  getBettingPredictions,
  getInterestedNews,
  getCountryNews,
  getTeamNews,
  type CuratedContentItem,
} from "@/app/actions/curatedContent";
import { MatchRow, ContentRow, groupMatches } from "@/components/feed/CuratedContentDisplay";
import { LeagueCoverageNote } from "@/components/feed/LeagueCoverageNote";
import { useCuratedInterests } from "@/hooks/useCuratedInterests";
import { useCuratedContentReactions } from "@/hooks/useCuratedContentReactions";
import type { ReactionType } from "@/app/actions/curatedContentReactions";
import { DiscoverInterestPicker } from "@/components/DiscoverInterestPicker";
import { Button } from "@/components/ui/button";
import { ListPlus } from "lucide-react";

const TOPICS = [
  { key: "football-news", label: "Football news", categories: ["football_news"] },
  { key: "crypto", label: "Crypto", categories: ["crypto_price", "crypto_news"] },
  { key: "music", label: "Music", categories: ["music_news"] },
  { key: "gossip", label: "Gossip", categories: ["gossip_news"] },
  { key: "videos", label: "Videos", categories: ["video_trending"] },
  { key: "education", label: "Education", categories: ["education_news"] },
  { key: "tech", label: "Tech", categories: ["tech_news"] },
  { key: "fraud", label: "Fraud", categories: ["fraud_alert"] },
];

const SCORE_TABS = [
  { key: "fixtures", label: "Fixtures", emptyMessage: "No upcoming fixtures — check back once the football feed has run." },
  { key: "live", label: "Live", emptyMessage: "Nothing live right now — check back once a match kicks off." },
  { key: "results", label: "Results", emptyMessage: "No recent results yet — check back once a match finishes." },
];
const SCORE_TAB_KEYS = new Set(SCORE_TABS.map(tab => tab.key));

function EmptySection({ label }: { label: string }) {
  return <p className="py-4 text-center text-sm text-muted-foreground">{label}</p>;
}

type ReactionProps = {
  getReaction: (contentId: string) => import("@/app/actions/curatedContentReactions").CuratedContentReactionSummary;
  toggle: (contentId: string, type: ReactionType) => void;
};

function MatchesList({
  matches,
  emptyMessage,
  getReaction,
  toggle,
}: { matches: CuratedContentItem[]; emptyMessage: string } & ReactionProps) {
  if (matches.length === 0) return <EmptySection label={emptyMessage} />;

  return (
    <div className="space-y-2">
      {matches.map(match => (
        <MatchRow
          key={match.id}
          match={match}
          reaction={getReaction(match.id)}
          onToggleReaction={type => toggle(match.id, type)}
        />
      ))}
    </div>
  );
}

function ContentList({
  items,
  emptyMessage,
  getReaction,
  toggle,
}: { items: CuratedContentItem[]; emptyMessage: string } & ReactionProps) {
  if (items.length === 0) return <EmptySection label={emptyMessage} />;

  return (
    <div className="space-y-2">
      {items.map(item => (
        <ContentRow
          key={item.id}
          item={item}
          reaction={getReaction(item.id)}
          onToggleReaction={type => toggle(item.id, type)}
        />
      ))}
    </div>
  );
}

// Shared by Fixtures/Live/Results/Betting — a league choice made once
// applies to all four instead of each tracking (and possibly disagreeing
// about) its own filter.
function LeagueFilterToggle({
  filterToMine,
  setFilterToMine,
}: {
  filterToMine: boolean;
  setFilterToMine: (value: boolean) => void;
}) {
  return (
    <div className="mb-3 flex gap-2">
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

type TabCache = Record<string, CuratedContentItem[] | undefined>;
type TrendsCache = {
  scores: CuratedContentItem[];
  betting: CuratedContentItem[];
  teamNews: CuratedContentItem[];
  countryNews: CuratedContentItem[];
  topics: TabCache;
};

export default function DiscoverTrends() {
  const { interests, leagueCodes, topics, teamNames, countries, hasAnyInterest, refetch: refetchInterests } =
    useCuratedInterests();
  const hasLeagueInterests = leagueCodes.length > 0;
  const hasBettingInterest = topics.includes("betting_prediction");
  const selectedTopics = TOPICS.filter(topic => topic.categories.some(category => topics.includes(category)));

  // Only Trends (the personalized digest) is unconditional — every other
  // tab is a full unfiltered browse of one category, and showing one for a
  // league/topic the visitor never picked defeats the point of picking
  // interests at all (confirmed live: this used to list every tab
  // regardless of selection).
  const tabs = [
    { key: "trends", label: "Trends" },
    ...(hasLeagueInterests ? SCORE_TABS : []),
    ...(hasBettingInterest ? [{ key: "betting", label: "Betting" }] : []),
    ...selectedTopics,
  ];

  // Auto-open for a first-time visitor with nothing picked yet — that's
  // exactly who needs it surfaced immediately, not tucked behind a button
  // they'd have no reason to click. Anyone who already has interests can
  // still reach it via the toggle to add more without leaving the page.
  const [showPicker, setShowPicker] = useState(false);
  useEffect(() => {
    if (interests !== null && !hasAnyInterest) setShowPicker(true);
  }, [interests, hasAnyInterest]);

  const [activeTab, setActiveTab] = useState("trends");
  const [filterToMine, setFilterToMine] = useState(true);
  const [scoresCache, setScoresCache] = useState<CuratedContentItem[] | undefined>();
  const [bettingCache, setBettingCache] = useState<CuratedContentItem[] | undefined>();
  const [topicCache, setTopicCache] = useState<TabCache>({});
  const [trendsCache, setTrendsCache] = useState<TrendsCache | null>(null);
  const [loading, setLoading] = useState(false);

  // One reactions batch for the whole page rather than one per tab/section —
  // simpler than juggling a separate hook instance per cache, and the total
  // row count across every tab a visitor has actually opened stays small.
  const allLoadedIds = useMemo(() => {
    const ids = new Set<string>();
    if (trendsCache) {
      trendsCache.scores.forEach(item => ids.add(item.id));
      trendsCache.betting.forEach(item => ids.add(item.id));
      trendsCache.teamNews.forEach(item => ids.add(item.id));
      trendsCache.countryNews.forEach(item => ids.add(item.id));
      Object.values(trendsCache.topics).forEach(items => items?.forEach(item => ids.add(item.id)));
    }
    (scoresCache ?? []).forEach(item => ids.add(item.id));
    (bettingCache ?? []).forEach(item => ids.add(item.id));
    Object.values(topicCache).forEach(items => items?.forEach(item => ids.add(item.id)));
    return Array.from(ids);
  }, [trendsCache, scoresCache, bettingCache, topicCache]);
  const { getReaction, toggle } = useCuratedContentReactions(allLoadedIds);

  const scopedLeagues = filterToMine && hasLeagueInterests ? leagueCodes : undefined;

  const ensureScores = async () => {
    const items = await getFootballScores(scopedLeagues);
    setScoresCache(items);
    return items;
  };

  const ensureBetting = async () => {
    const items = await getBettingPredictions(scopedLeagues, 30);
    setBettingCache(items);
    return items;
  };

  const ensureTopic = async (key: string, categories: string[]) => {
    if (topicCache[key] !== undefined) return topicCache[key]!;
    const items = await getInterestedNews(categories, 30);
    setTopicCache(prev => ({ ...prev, [key]: items }));
    return items;
  };

  // Refetch whenever the shared league filter changes, but only for tabs
  // already visited at least once — no point eagerly fetching all four on
  // every toggle flip before the visitor has looked at any of them.
  useEffect(() => {
    if (scoresCache !== undefined) void ensureScores();
    if (bettingCache !== undefined) void ensureBetting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterToMine, leagueCodes.join(",")]);

  // A personalized digest, not a full unfiltered browse — only sections the
  // visitor actually picked in Settings show up here (confirmed live: this
  // used to show every topic and every league's scores regardless of
  // interests, which is what the explicit per-topic tabs below are for).
  const loadTrends = async () => {
    const [scores, betting, teamNewsItems, countryItems, ...topicResults] = await Promise.all([
      leagueCodes.length > 0 ? getFootballScores(leagueCodes) : Promise.resolve([]),
      topics.includes("betting_prediction") ? getBettingPredictions(leagueCodes, 2) : Promise.resolve([]),
      teamNames.length > 0 ? getTeamNews(teamNames, 2) : Promise.resolve([]),
      countries.length > 0 ? getCountryNews(countries, 2) : Promise.resolve([]),
      ...TOPICS.map(topic => {
        const selected = topic.categories.filter(c => topics.includes(c));
        return selected.length > 0 ? getInterestedNews(selected, 2) : Promise.resolve([]);
      }),
    ]);

    const topicItems: TabCache = {};
    TOPICS.forEach((topic, index) => {
      topicItems[topic.key] = topicResults[index];
    });

    setTrendsCache({ scores, betting, teamNews: teamNewsItems, countryNews: countryItems, topics: topicItems });
  };

  // Interests resolve async (a separate client fetch — see
  // useCuratedInterests) — `interests` is null until that first completes,
  // so this waits rather than loading an unpersonalized Trends tab first
  // and re-fetching a beat later.
  useEffect(() => {
    if (interests === null) return;
    setLoading(true);
    void loadTrends().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interests === null, leagueCodes.join(","), topics.join(","), teamNames.join(","), countries.join(",")]);

  const handleTabChange = async (value: string) => {
    setActiveTab(value);

    if (value === "trends") return;

    if (SCORE_TAB_KEYS.has(value) && scoresCache === undefined) {
      setLoading(true);
      await ensureScores();
      setLoading(false);
      return;
    }

    if (value === "betting" && bettingCache === undefined) {
      setLoading(true);
      await ensureBetting();
      setLoading(false);
      return;
    }

    const topic = TOPICS.find(t => t.key === value);
    if (topic && topicCache[value] === undefined) {
      setLoading(true);
      await ensureTopic(topic.key, topic.categories);
      setLoading(false);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="scrollbar-none flex w-full justify-start gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <TabsTrigger key={tab.key} value={tab.key} className="shrink-0">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
          onClick={() => setShowPicker(v => !v)}
        >
          <ListPlus className="size-3.5" />
          {hasAnyInterest ? "Tick more interests" : "Tick your interests"}
        </Button>

        {showPicker && (
          <div className="mt-2">
            <DiscoverInterestPicker interests={interests ?? new Set()} onChanged={refetchInterests} />
          </div>
        )}
      </div>

      <TabsContent value="trends" className={cn("space-y-6 pt-4", loading && activeTab === "trends" && "opacity-60")}>
        {!trendsCache ? (
          <EmptySection label="Loading trends…" />
        ) : (
          <>
            {leagueCodes.length > 0 &&
              (() => {
                const { live, upcoming, results } = groupMatches(trendsCache.scores);
                const sections = [
                  { label: "Fixtures", matches: upcoming },
                  { label: "Live", matches: live },
                  { label: "Results", matches: results },
                ];
                return sections
                  .filter(section => section.matches.length > 0)
                  .map(section => (
                    <section key={section.label} className="space-y-2">
                      <h3 className="text-sm font-semibold">{section.label}</h3>
                      {section.matches.slice(0, 2).map(match => (
                        <MatchRow
                          key={match.id}
                          match={match}
                          reaction={getReaction(match.id)}
                          onToggleReaction={type => toggle(match.id, type)}
                        />
                      ))}
                    </section>
                  ));
              })()}

            {topics.includes("betting_prediction") && trendsCache.betting.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Betting</h3>
                {trendsCache.betting.map(item => (
                  <ContentRow
                    key={item.id}
                    item={item}
                    reaction={getReaction(item.id)}
                    onToggleReaction={type => toggle(item.id, type)}
                  />
                ))}
              </section>
            )}

            {teamNames.length > 0 && trendsCache.teamNews.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Your teams</h3>
                {trendsCache.teamNews.map(item => (
                  <ContentRow
                    key={item.id}
                    item={item}
                    reaction={getReaction(item.id)}
                    onToggleReaction={type => toggle(item.id, type)}
                  />
                ))}
              </section>
            )}

            {TOPICS.map(topic => {
              const items = trendsCache.topics[topic.key] ?? [];
              if (items.length === 0) return null;
              return (
                <section key={topic.key} className="space-y-2">
                  <h3 className="text-sm font-semibold">{topic.label}</h3>
                  {items.map(item => (
                    <ContentRow
                    key={item.id}
                    item={item}
                    reaction={getReaction(item.id)}
                    onToggleReaction={type => toggle(item.id, type)}
                  />
                  ))}
                </section>
              );
            })}

            {countries.length > 0 && trendsCache.countryNews.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">News near you</h3>
                {trendsCache.countryNews.map(item => (
                  <ContentRow
                    key={item.id}
                    item={item}
                    reaction={getReaction(item.id)}
                    onToggleReaction={type => toggle(item.id, type)}
                  />
                ))}
              </section>
            )}

            {!hasAnyInterest && (
              <div className="space-y-1 rounded-xl border py-6 text-center">
                <p className="text-sm font-medium">Nothing picked yet</p>
                <p className="px-4 text-xs text-muted-foreground">
                  Tick a league or topic above and Trends fills in with what you actually follow — favorite
                  teams and countries live in{" "}
                  <Link href="/settings/interests" className="font-medium text-primary hover:underline">
                    full interest settings
                  </Link>
                  .
                </p>
              </div>
            )}
          </>
        )}
      </TabsContent>

      {SCORE_TABS.map(tab => {
        const { live, upcoming, results } = groupMatches(scoresCache ?? []);
        const matches = tab.key === "live" ? live : tab.key === "results" ? results : upcoming;
        return (
          <TabsContent
            key={tab.key}
            value={tab.key}
            className={cn("pt-4", loading && activeTab === tab.key && "opacity-60")}
          >
            <LeagueCoverageNote />
            {hasLeagueInterests && (
              <LeagueFilterToggle filterToMine={filterToMine} setFilterToMine={setFilterToMine} />
            )}
            <MatchesList
              matches={matches}
              emptyMessage={tab.emptyMessage}
              getReaction={getReaction}
              toggle={toggle}
            />
          </TabsContent>
        );
      })}

      <TabsContent value="betting" className={cn("pt-4", loading && activeTab === "betting" && "opacity-60")}>
        {hasLeagueInterests && (
          <LeagueFilterToggle filterToMine={filterToMine} setFilterToMine={setFilterToMine} />
        )}
        <ContentList
          items={bettingCache ?? []}
          emptyMessage="No predictions right now — check back once the betting feed has run."
          getReaction={getReaction}
          toggle={toggle}
        />
      </TabsContent>

      {selectedTopics.map(topic => {
        const items = topicCache[topic.key] ?? [];
        return (
          <TabsContent
            key={topic.key}
            value={topic.key}
            className={cn("space-y-2 pt-4", loading && activeTab === topic.key && "opacity-60")}
          >
            {items.length === 0 ? (
              <EmptySection label="Nothing here yet — check back once this feed has run." />
            ) : (
              items.map(item => (
                <ContentRow
                  key={item.id}
                  item={item}
                  reaction={getReaction(item.id)}
                  onToggleReaction={type => toggle(item.id, type)}
                />
              ))
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
