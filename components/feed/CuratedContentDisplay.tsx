"use client";

import Image from "next/image";
import { format } from "date-fns";
import { Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCompactTimeAgo } from "@/lib/time-format.mjs";
import type { CuratedContentItem } from "@/app/actions/curatedContent";

// Shared between /updates and Discover's Trends/category tabs — both render
// the same curated_content rows, just in different tab/filter arrangements.

// getCompactTimeAgo only handles the past — it computes now-minus-date with
// no floor, so a future timestamp (an upcoming fixture's kickoff, or a
// betting prediction published with that same future commence_time) comes
// back as a raw negative number of minutes instead of a sensible label
// (confirmed live: betting predictions were rendering "-21190m"). date-fns'
// format() is also locale-independent, unlike toLocaleString(undefined,
// ...), which caused a separate server/client hydration mismatch here.
export function formatContentTime(publishedAt: string) {
  const date = new Date(publishedAt);
  if (date.getTime() > Date.now()) return format(date, "EEE h:mm a");
  return getCompactTimeAgo(date);
}

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

export function MatchRow({ match }: { match: CuratedContentItem }) {
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

// A match moving fixture -> live -> result keeps its published_at meaning
// different per category (kickoff time vs. result time) — grouping and
// sorting each bucket separately keeps live first, soonest-upcoming next,
// most-recent-result last, instead of one list sorted by a mixed meaning.
export function groupMatches(matches: CuratedContentItem[]) {
  const live = matches.filter(m => m.category === "football_live");
  const upcoming = [...matches.filter(m => m.category === "football_fixture")].sort(
    (a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
  );
  const results = matches.filter(m => m.category === "football_result");
  return { live, upcoming, results };
}

export function ContentRow({ item }: { item: CuratedContentItem }) {
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
