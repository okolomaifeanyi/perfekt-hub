"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { getFootballScores, getInterestedNews, type CuratedContentItem } from "@/app/actions/curatedContent";
import { MatchRow, ContentRow, groupMatches } from "@/components/feed/CuratedContentDisplay";

const TOPICS = [
  { key: "betting", label: "Betting", categories: ["betting_prediction"] },
  { key: "crypto", label: "Crypto", categories: ["crypto_price", "crypto_news"] },
  { key: "movies", label: "Movies", categories: ["movie_news"] },
  { key: "music", label: "Music", categories: ["music_news"] },
  { key: "gossip", label: "Gossip", categories: ["gossip_news"] },
  { key: "videos", label: "Videos", categories: ["video_trending"] },
  { key: "education", label: "Education", categories: ["education_news"] },
  { key: "tech", label: "Tech", categories: ["tech_news"] },
  { key: "fraud", label: "Fraud", categories: ["fraud_alert"] },
];

const TABS = [{ key: "trends", label: "Trends" }, { key: "scores", label: "Scores" }, ...TOPICS];

function EmptySection({ label }: { label: string }) {
  return <p className="py-4 text-center text-sm text-muted-foreground">{label}</p>;
}

function ScoresList({ matches }: { matches: CuratedContentItem[] }) {
  const { live, upcoming, results } = groupMatches(matches);

  if (matches.length === 0) {
    return <EmptySection label="No scores yet — check back once the football feed has run." />;
  }

  return (
    <div className="space-y-6">
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
  );
}

// Lazy per-tab: 11 tabs each firing their own query on page load would be
// wasteful — undefined means "not fetched yet", fetched on first visit to
// that tab and cached here for the rest of the session.
type TabCache = Record<string, CuratedContentItem[] | undefined>;

export default function DiscoverTrends() {
  const [activeTab, setActiveTab] = useState("trends");
  const [scoresCache, setScoresCache] = useState<CuratedContentItem[] | undefined>();
  const [topicCache, setTopicCache] = useState<TabCache>({});
  const [trendsCache, setTrendsCache] = useState<{ scores: CuratedContentItem[]; topics: TabCache } | null>(null);
  const [loading, setLoading] = useState(false);

  const ensureScores = async () => {
    if (scoresCache !== undefined) return scoresCache;
    const items = await getFootballScores();
    setScoresCache(items);
    return items;
  };

  const ensureTopic = async (key: string, categories: string[]) => {
    if (topicCache[key] !== undefined) return topicCache[key]!;
    const items = await getInterestedNews(categories, 30);
    setTopicCache(prev => ({ ...prev, [key]: items }));
    return items;
  };

  const loadTrends = async () => {
    if (trendsCache) return;
    setLoading(true);
    const [scores, ...topicResults] = await Promise.all([
      getFootballScores(),
      ...TOPICS.map(topic => getInterestedNews(topic.categories, 2)),
    ]);
    const topics: TabCache = {};
    TOPICS.forEach((topic, index) => {
      topics[topic.key] = topicResults[index];
    });
    setTrendsCache({ scores, topics });
    setLoading(false);
  };

  // Trends is the default tab — fetch it as soon as the page mounts instead
  // of waiting for a click, since it's the view everyone sees first.
  useEffect(() => {
    void loadTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = async (value: string) => {
    setActiveTab(value);

    if (value === "trends") {
      await loadTrends();
      return;
    }

    if (value === "scores" && scoresCache === undefined) {
      setLoading(true);
      await ensureScores();
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
        {TABS.map(tab => (
          <TabsTrigger key={tab.key} value={tab.key} className="shrink-0">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="trends" className={cn("space-y-6 pt-4", loading && activeTab === "trends" && "opacity-60")}>
        {!trendsCache ? (
          <EmptySection label="Loading trends…" />
        ) : (
          <>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Scores</h3>
              {(() => {
                const { live, upcoming, results } = groupMatches(trendsCache.scores);
                const preview = [...live, ...upcoming, ...results].slice(0, 2);
                return preview.length === 0 ? (
                  <EmptySection label="No scores yet." />
                ) : (
                  preview.map(match => <MatchRow key={match.id} match={match} />)
                );
              })()}
            </section>

            {TOPICS.map(topic => {
              const items = trendsCache.topics[topic.key] ?? [];
              if (items.length === 0) return null;
              return (
                <section key={topic.key} className="space-y-2">
                  <h3 className="text-sm font-semibold">{topic.label}</h3>
                  {items.map(item => (
                    <ContentRow key={item.id} item={item} />
                  ))}
                </section>
              );
            })}
          </>
        )}
      </TabsContent>

      <TabsContent value="scores" className={cn("pt-4", loading && activeTab === "scores" && "opacity-60")}>
        <ScoresList matches={scoresCache ?? []} />
      </TabsContent>

      {TOPICS.map(topic => {
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
              items.map(item => <ContentRow key={item.id} item={item} />)
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
