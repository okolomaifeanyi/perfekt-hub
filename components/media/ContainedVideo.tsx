"use client";

import * as React from "react";
import { useInView } from "react-intersection-observer";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fallbackColorFromSrc,
  sampleAverageColorFromVideoElement,
} from "@/lib/image-colors.mjs";
import { DataSaverPlaceholder, useDataSaverGate } from "./DataSaverGate";
import { useActiveVideoStore } from "@/lib/store/useActiveVideoStore";

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
  // Controlled mute mode — when provided, the mute button calls this
  // instead of managing its own local mute state, so a caller can share
  // one mute preference across many instances (see useVideoMuteStore,
  // used by the /watch reel — unmuting one video there should unmute
  // whichever one is next, not silently reset per video).
  onToggleMute?: () => void;
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
  onToggleMute,
}: ContainedVideoProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const instanceId = React.useId();
  const [backgroundColor, setBackgroundColor] = React.useState(() =>
    fallbackColorFromSrc(src)
  );
  const [isMuted, setIsMuted] = React.useState(muted);
  const canHover = useCanHover();
  const { isGated, reveal } = useDataSaverGate();

  // Only one video anywhere should ever be playing at once — matches how
  // every major feed behaves, instead of every autoplaying video in the
  // timeline (or every video in a single multi-video post) competing for
  // attention simultaneously.
  const activeVideoId = useActiveVideoStore(state => state.activeId);
  const claimActiveVideo = useActiveVideoStore(state => state.claim);
  const releaseActiveVideo = useActiveVideoStore(state => state.release);

  // Touch devices have no hover state, so the "autoplay on hover" preview
  // would otherwise never trigger at all — this is its fallback. Gating it
  // on actually being scrolled into view matters here specifically: unlike
  // the hover path (which only ever fires once the pointer is physically
  // over the video), a touch device has no equivalent gesture, so without
  // this every video-containing post in the timeline would start playing
  // the moment it mounts — which, with infinite scroll, can be many posts
  // before the one actually on screen.
  const { ref: inViewRef, inView } = useInView({ threshold: 0.6 });

  React.useEffect(() => {
    setIsMuted(muted);
  }, [muted]);

  React.useEffect(() => {
    setBackgroundColor(fallbackColorFromSrc(src));
  }, [src]);

  // Data Saver overrides all of this: no autoplay until explicitly revealed.
  const touchAutoPlay = autoPlayOnHover && !canHover && inView;
  const effectiveAutoPlay = !isGated && (autoPlay || touchAutoPlay);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!effectiveAutoPlay) {
      video.pause();
      return;
    }

    const play = () => {
      claimActiveVideo(instanceId);
      void video.play().catch(() => {});
    };

    if (video.readyState >= 2) {
      play();
      return;
    }

    video.addEventListener("loadeddata", play, { once: true });
    return () => video.removeEventListener("loadeddata", play);
  }, [effectiveAutoPlay, src, claimActiveVideo, instanceId]);

  // Some other instance claimed the active slot — stop, regardless of how
  // this one started playing (autoplay, hover, or a manual tap on native
  // controls elsewhere).
  React.useEffect(() => {
    if (activeVideoId !== null && activeVideoId !== instanceId) {
      videoRef.current?.pause();
    }
  }, [activeVideoId, instanceId]);

  React.useEffect(() => {
    return () => releaseActiveVideo(instanceId);
  }, [instanceId, releaseActiveVideo]);

  const sampleBackground = React.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setBackgroundColor(sampleAverageColorFromVideoElement(video));
  }, []);

  const playPreview = React.useCallback(() => {
    if (!autoPlayOnHover) return;
    const video = videoRef.current;
    if (!video) return;

    claimActiveVideo(instanceId);
    void video.play().catch(() => {});
  }, [autoPlayOnHover, claimActiveVideo, instanceId]);

  const pausePreview = React.useCallback(() => {
    if (!autoPlayOnHover) return;
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = 0;
    releaseActiveVideo(instanceId);
  }, [autoPlayOnHover, instanceId, releaseActiveVideo]);

  const setContainerRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      inViewRef(node);
    },
    [inViewRef]
  );

  return (
    <div
      ref={setContainerRef}
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
            onPlay={() => claimActiveVideo(instanceId)}
            onPause={() => releaseActiveVideo(instanceId)}
          />

          {showMuteToggle && (
            <button
              type="button"
              onClick={event => {
                event.stopPropagation();
                if (onToggleMute) {
                  onToggleMute();
                } else {
                  setIsMuted(prev => !prev);
                }
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
