"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Radio, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LinkPreviewCard } from "@/components/LinkPreviewCard";
import type { CuratedContentItem } from "@/app/actions/curatedContent";
import { ActionBar, formatContentTime } from "@/components/feed/CuratedContentDisplay";
import { useCuratedContentReactions } from "@/hooks/useCuratedContentReactions";
import { FOOTBALL_CATEGORIES } from "@/lib/curated-content-categories.mjs";

type FootballMetadata = {
  competition?: string;
  matchday?: number | null;
  homeTeam?: { name?: string | null; shortName?: string | null; crest?: string | null };
  awayTeam?: { name?: string | null; shortName?: string | null; crest?: string | null };
  score?: { home: number; away: number } | null;
  minute?: number | null;
};

function teamLabel(team?: { name?: string | null; shortName?: string | null }) {
  return team?.name || team?.shortName || "TBD";
}

export default function ContentDetailClient({
  item,
  analysis,
}: {
  item: CuratedContentItem;
  analysis?: CuratedContentItem | null;
}) {
  const { getReaction, toggle } = useCuratedContentReactions([item.id]);
  const isMatch = FOOTBALL_CATEGORIES.includes(item.category);
  const isLive = item.category === "football_live";
  const meta = item.metadata as FootballMetadata;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 pt-4">
      <Link
        href="/updates"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back to Updates
      </Link>

      <div className="overflow-hidden rounded-xl border border-border/60">
        {isMatch ? (
          <div className="px-4 py-6">
            <p className="text-center text-xs text-muted-foreground">{meta.competition}</p>
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="flex w-24 flex-col items-center gap-2 text-center">
                {meta.homeTeam?.crest ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={meta.homeTeam.crest} alt="" className="size-12" />
                ) : null}
                <p className="text-sm font-medium">{teamLabel(meta.homeTeam)}</p>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                {typeof meta.score?.home === "number" && typeof meta.score?.away === "number" ? (
                  <span className="font-mono text-2xl font-bold tabular-nums">
                    {meta.score.home}-{meta.score.away}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">vs</span>
                )}
                {isLive ? (
                  <Badge variant="destructive" className="gap-1 text-[10px]">
                    <Radio className="size-2.5" />
                    {typeof meta.minute === "number" ? `${meta.minute}'` : "Live"}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">{formatContentTime(item.published_at)}</span>
                )}
              </div>

              <div className="flex w-24 flex-col items-center gap-2 text-center">
                {meta.awayTeam?.crest ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={meta.awayTeam.crest} alt="" className="size-12" />
                ) : null}
                <p className="text-sm font-medium">{teamLabel(meta.awayTeam)}</p>
              </div>
            </div>
            {meta.matchday ? (
              <p className="mt-4 text-center text-xs text-muted-foreground">Matchday {meta.matchday}</p>
            ) : null}
            {item.body ? (
              <p className="mt-4 whitespace-pre-line text-center text-sm text-muted-foreground">{item.body}</p>
            ) : null}
          </div>
        ) : (
          <>
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt=""
                width={800}
                height={450}
                unoptimized
                className="aspect-video w-full object-cover"
              />
            ) : null}
            <div className="space-y-3 p-4">
              <h1 className="text-xl font-semibold leading-snug">{item.title}</h1>
              <p className="text-xs text-muted-foreground">
                {item.source_name} · {formatContentTime(item.published_at)}
              </p>
              {item.body ? <p className="whitespace-pre-line text-sm leading-relaxed">{item.body}</p> : null}
            </div>
          </>
        )}

        {analysis?.body ? (
          <div className="border-t border-border/60 px-4 py-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5" /> AI analysis
            </p>
            <p className="whitespace-pre-line text-sm leading-relaxed">{analysis.body}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Generated from recent form and head-to-head history — not a guarantee.
            </p>
          </div>
        ) : null}

        {item.source_url ? (
          <div className="border-t border-border/60 px-4 py-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Source</p>
            <LinkPreviewCard url={item.source_url} />
          </div>
        ) : null}

        <ActionBar
          item={item}
          reaction={getReaction(item.id)}
          onToggle={type => toggle(item.id, type)}
          defaultShowComments
        />
      </div>
    </div>
  );
}
