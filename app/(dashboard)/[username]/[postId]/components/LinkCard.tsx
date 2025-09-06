"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface LinkMeta {
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  error?: boolean;
}

export default function LinkCard({ url }: { url: string }) {
  const [meta, setMeta] = useState<LinkMeta | null>(null);

  useEffect(() => {
    async function fetchMeta() {
      try {
        const res = await fetch(
          `/api/link-preview?url=${encodeURIComponent(url)}`
        );
        const data = await res.json();
        setMeta(data);
      } catch {
        setMeta({ error: true });
      }
    }
    fetchMeta();
  }, [url]);

  if (!meta) {
    return <div className="h-24 w-full animate-pulse rounded-md bg-muted" />;
  }

  if (meta.error) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline"
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
      className="flex gap-3 border rounded-lg p-3 hover:bg-muted/40 transition"
    >
      {meta.image && (
        <Image
          src={meta.image}
          alt={meta.title || "Link preview image"}
          width={80}
          height={80}
          className="w-20 h-20 object-cover rounded-md"
        />
      )}
      <div className="flex-1">
        <h4 className="font-medium line-clamp-1">{meta.title}</h4>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {meta.description || meta.url}
        </p>
      </div>
    </a>
  );
}
