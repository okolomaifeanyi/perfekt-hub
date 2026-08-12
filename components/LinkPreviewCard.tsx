"use client";

import { ContainedImage } from "@/components/media/ContainedImage";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface LinkMeta {
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  error?: boolean;
}

type LinkPreviewCardProps = {
  url: string;
  className?: string;
};

export function LinkPreviewCard({ url, className }: LinkPreviewCardProps) {
  const [meta, setMeta] = useState<LinkMeta | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchMeta() {
      try {
        const res = await fetch(
          `/api/link-preview?url=${encodeURIComponent(url)}`
        );

        const data = await res.json().catch(() => null);
        if (!active) return;

        if (!res.ok || !data) {
          setMeta({ error: true, url });
          return;
        }

        setMeta(data);
      } catch {
        if (!active) return;
        setMeta({ error: true, url });
      }
    }

    setMeta(null);
    void fetchMeta();

    return () => {
      active = false;
    };
  }, [url]);

  if (!meta) {
    return (
      <div
        className={cn("h-24 w-full animate-pulse rounded-xl bg-muted", className)}
      />
    );
  }

  if (meta.error) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("text-blue-600 underline", className)}
      >
        {url}
      </a>
    );
  }

  return (
    <a
      href={meta.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex gap-3 overflow-hidden rounded-xl bg-card/50 p-3 transition hover:bg-background/50",
        className
      )}
    >
      {meta.image && (
        <ContainedImage
          src={meta.image}
          alt={meta.title || "Link preview image"}
          sizes="80px"
          className="h-20 w-20 shrink-0 rounded-lg"
          imageClassName="rounded-lg p-1"
        />
      )}
      <div className="min-w-0 flex-1">
        {meta.title && <h4 className="line-clamp-1 font-medium">{meta.title}</h4>}
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {meta.description || meta.url}
        </p>
      </div>
    </a>
  );
}
