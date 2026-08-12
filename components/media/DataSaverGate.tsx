"use client";

import * as React from "react";
import { Download, Play } from "lucide-react";
import { useDataSaverStore } from "@/lib/store/useDataSaverStore";

// Shared by ContainedImage/ContainedVideo: when Data Saver is on, media isn't
// fetched or autoplayed at all until the viewer explicitly asks for it — this
// hook is the single source of truth for "should this instance be gated
// right now", independent per media instance (revealing one doesn't reveal
// others).
export function useDataSaverGate() {
  const dataSaverEnabled = useDataSaverStore(state => state.dataSaverEnabled);
  const [revealed, setRevealed] = React.useState(false);

  return {
    // Data Saver off => never gated. On => gated until explicitly revealed.
    isGated: dataSaverEnabled && !revealed,
    reveal: () => setRevealed(true),
  };
}

export function DataSaverPlaceholder({
  backgroundColor,
  kind,
  onReveal,
}: {
  backgroundColor: string;
  kind: "image" | "video";
  onReveal: () => void;
}) {
  return (
    <button
      type="button"
      onClick={event => {
        event.stopPropagation();
        onReveal();
      }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white backdrop-blur-xl transition hover:brightness-110"
      style={{ backgroundColor }}
      aria-label={kind === "video" ? "Play video" : "Load image"}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-black/40">
        {kind === "video" ? (
          <Play className="size-5" />
        ) : (
          <Download className="size-5" />
        )}
      </span>
      <span className="text-xs font-medium">
        {kind === "video" ? "Tap to play" : "Tap to load"} · Data Saver on
      </span>
    </button>
  );
}
