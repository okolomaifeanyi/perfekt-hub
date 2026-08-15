"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { Radio } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCompactTimeAgo } from "@/lib/time-format.mjs";
import { getNewsFeed, type CuratedContentItem } from "@/app/actions/curatedContent";
import { NEWS_CATEGORY_FILTERS } from "@/lib/curated-content-categories.mjs";

type UpdatesClientProps = {
  initialScores: CuratedContentItem[];
  initialNews: CuratedContentItem[];
};

type FootballMetadata = {
  competition?: string;
  status?: string;
  minute?: number | null;
  matchday?: number | null;
  homeTeam?: { name?: string | null; shortName?: string | null; crest?: string | null };
  awayTeam?: { name?: string | null; shortName?: string | null; crest?: string | null };
  score?: { home: number; away: number } | null;
};

function teamLabel(team?: { name?: string | null; shortName?: string | null }) {
  return team?.shortName || team?.name || "TBD";
}

// getCompactTimeAgo only handles the past — it computes now-minus-date with
// no floor, so a future timestamp (an upcoming fixture's kickoff, or a
// betting prediction published with that same future commence_time) comes
// back as a raw negative number of minutes instead of a sensible label
// (confirmed live: betting predictions were rendering "-21190m"). date-fns'
// format() is also locale-independent, unlike toLocaleString(undefined,
// ...), which caused a separate server/client hydration mismatch here.
function formatContentTime(publishedAt: string) {
  const date = new Date(publishedAt);
  if (date.getTime() > Date.now()) return format(date, "EEE h:mm a");
  return getCompactTimeAgo(date);
}

function MatchRow({ match }: { match: CuratedContentItem }) {
  const meta = match.metadata as FootballMetadata;
  const isLive = match.category === "football_live";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{meta.competition}</p>
        <p className="truncate text-sm font-medium">
          {teamLabel(meta.homeTeam)} <span className="text-muted-foreground">vs</span>{" "}
          {teamLabel(meta.awayTeam)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {typeof meta.score?.home === "number" && typeof meta.score?.away === "number" ? (
          <span className="font-mono text-sm font-semibold tabular-nums">
            {meta.score.home}-{meta.score.away}
          </span>
        ) : null}

        {isLive ? (
          <Badge variant="destructive" className="gap-1 text-[10px]">
            <Radio className="size-2.5" />
            {typeof meta.minute === "number" ? `${meta.minute}'` : "Live"}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{formatContentTime(match.published_at)}</span>
        )}
      </div>
    </div>
  );
}

function ScoresPanel({ scores }: { scores: CuratedContentItem[] }) {
  const live = scores.filter(s => s.category === "football_live");
  const upcoming = [...scores.filter(s => s.category === "football_fixture")].sort(
    (a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
  );
  const results = scores.filter(s => s.category === "football_result");

  if (scores.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">
        No scores yet — check back once the football feed has run.
      </p>
    );
  }

  return (
    <div className="space-y-6 px-4">
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

function ContentRow({ item }: { item: CuratedContentItem }) {
  const content = (
    <div className="flex gap-3 rounded-lg border border-border/60 px-3 py-2.5 transition hover:bg-accent/40">
      {item.image_url ? (
        <Image
          src={item.image_url}
          alt=""
          width={64}
          height={64}
          unoptimized
          className="size-16 shrink-0 rounded-md object-cover"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
        {item.body ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          {item.source_name} · {formatContentTime(item.published_at)}
        </p>
      </div>
    </div>
  );

  if (!item.source_url) return content;

  return (
    <a href={item.source_url} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  );
}

function NewsPanel({ initialNews }: { initialNews: CuratedContentItem[] }) {
  const [category, setCategory] = useState("all");
  const [news, setNews] = useState(initialNews);
  const [isPending, startTransition] = useTransition();

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    startTransition(async () => {
      const items = await getNewsFeed(value);
      setNews(items);
    });
  };

  return (
    <div className="space-y-3 px-4">
      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
        {NEWS_CATEGORY_FILTERS.map(filter => (
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
  return (
    <Tabs defaultValue="scores" className="w-full pt-4">
      <TabsList className="sticky top-0 z-20 mb-4 flex w-full justify-center gap-2 bg-background/80 backdrop-blur-sm">
        <TabsTrigger value="scores">Scores</TabsTrigger>
        <TabsTrigger value="news">News</TabsTrigger>
      </TabsList>

      <TabsContent value="scores">
        <ScoresPanel scores={initialScores} />
      </TabsContent>

      <TabsContent value="news">
        <NewsPanel initialNews={initialNews} />
      </TabsContent>
    </Tabs>
  );
}
