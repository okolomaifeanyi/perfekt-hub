"use client";

import * as React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fallbackColorFromSrc,
  sampleAverageColorFromVideoElement,
} from "@/lib/image-colors.mjs";
import { DataSaverPlaceholder, useDataSaverGate } from "./DataSaverGate";

type ContainedVideoProps = {
  src: string;
  className?: string;
  videoClassName?: string;
  autoPlay?: boolean;
  autoPlayOnHover?: boolean;
  controls?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  preload?: "none" | "metadata" | "auto";
  onClick?: React.MouseEventHandler<HTMLVideoElement>;
  // Renders a small mute/unmute button over the video. Useful anywhere a
  // video autoplays muted by default but the viewer should be able to turn
  // sound on without leaving the preview.
  showMuteToggle?: boolean;
};

function useCanHover() {
  const [canHover, setCanHover] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    setCanHover(query.matches);

    const listener = (event: MediaQueryListEvent) => setCanHover(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return canHover;
}

export function ContainedVideo({
  src,
  className,
  videoClassName,
  autoPlay = false,
  autoPlayOnHover = false,
  controls = false,
  muted = true,
  loop = true,
  playsInline = true,
  preload = "metadata",
  onClick,
  showMuteToggle = false,
}: ContainedVideoProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [backgroundColor, setBackgroundColor] = React.useState(() =>
    fallbackColorFromSrc(src)
  );
  const [isMuted, setIsMuted] = React.useState(muted);
  const canHover = useCanHover();
  const { isGated, reveal } = useDataSaverGate();

  React.useEffect(() => {
    setIsMuted(muted);
  }, [muted]);

  React.useEffect(() => {
    setBackgroundColor(fallbackColorFromSrc(src));
  }, [src]);

  // Touch devices have no hover state to trigger an "autoplay on hover"
  // preview, so they'd otherwise never autoplay at all — always-play there
  // instead, still muted by default same as the hover preview would be.
  // Data Saver overrides all of this: no autoplay until explicitly revealed.
  const effectiveAutoPlay = !isGated && (autoPlay || (autoPlayOnHover && !canHover));

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!effectiveAutoPlay) {
      video.pause();
      return;
    }

    const play = () => {
      void video.play().catch(() => {});
    };

    if (video.readyState >= 2) {
      play();
      return;
    }

    video.addEventListener("loadeddata", play, { once: true });
    return () => video.removeEventListener("loadeddata", play);
  }, [effectiveAutoPlay, src]);

  const sampleBackground = React.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setBackgroundColor(sampleAverageColorFromVideoElement(video));
  }, []);

  const playPreview = React.useCallback(() => {
    if (!autoPlayOnHover) return;
    const video = videoRef.current;
    if (!video) return;

    void video.play().catch(() => {});
  }, [autoPlayOnHover]);

  const pausePreview = React.useCallback(() => {
    if (!autoPlayOnHover) return;
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = 0;
  }, [autoPlayOnHover]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted/20 transition-colors duration-300",
        className
      )}
      style={{ backgroundColor }}
      onMouseEnter={playPreview}
      onMouseLeave={pausePreview}
    >
      {isGated ? (
        // Not even mounted — a <video> with preload="metadata"/"auto" starts
        // fetching as soon as it's in the DOM, which is exactly what Data
        // Saver is meant to prevent.
        <DataSaverPlaceholder
          backgroundColor={backgroundColor}
          kind="video"
          onReveal={reveal}
        />
      ) : (
        <>
          <video
            ref={videoRef}
            src={src}
            className={cn(
              "absolute inset-0 h-full w-full object-contain",
              videoClassName
            )}
            autoPlay={effectiveAutoPlay}
            controls={controls}
            muted={isMuted}
            loop={loop}
            playsInline={playsInline}
            preload={preload}
            crossOrigin="anonymous"
            onLoadedData={sampleBackground}
            onClick={onClick}
          />

          {showMuteToggle && (
            <button
              type="button"
              onClick={event => {
                event.stopPropagation();
                setIsMuted(prev => !prev);
              }}
              className="absolute bottom-2 right-2 z-10 inline-flex size-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
              aria-label={isMuted ? "Unmute video" : "Mute video"}
            >
              {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          )}
        </>
      )}
    </div>
  );
}
