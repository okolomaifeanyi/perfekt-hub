"use client";

import * as React from "react";
import { Maximize, Minimize, Pause, Play, Settings, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { applyVideoQuality, isCloudinaryVideoUrl, VIDEO_QUALITIES } from "@/lib/video-quality.mjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type VideoQuality = (typeof VIDEO_QUALITIES)[number];

const QUALITY_LABELS: Record<VideoQuality, string> = {
  auto: "Auto",
  high: "High",
  medium: "Medium",
  low: "Low (data saver)",
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// A fully custom control surface for video playback, used wherever a video
// is shown expanded (see PostMedia's lightbox) — the browser's native
// `controls` UI has no volume slider worth using, no quality switching, and
// its "..." menu offers a direct download link there's no way to remove.
// This is a client-side deterrent only, not real DRM — anyone determined
// enough can still pull the source URL from devtools — but it removes the
// one-click affordance.
export function CustomVideoPlayer({
  src,
  poster,
  className,
  autoPlay = false,
}: {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [quality, setQuality] = React.useState<VideoQuality>("auto");
  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [muted, setMuted] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const seekingRef = React.useRef(false);

  const resolvedSrc = isCloudinaryVideoUrl(src) ? applyVideoQuality(src, quality) : src;

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const handleVolumeChange = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
    setVolume(value);
    setMuted(value === 0);
  };

  const handleSeek = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrentTime(value);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      void container.requestFullscreen?.().catch(() => {});
    } else {
      void document.exitFullscreen?.().catch(() => {});
    }
  };

  React.useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Swapping `quality` changes `resolvedSrc`, which resets the underlying
  // <video> element entirely — without this, picking a different quality
  // would bounce the viewer back to the start instead of resuming where
  // they were.
  const wasPlayingRef = React.useRef(false);
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const resume = () => {
      video.currentTime = currentTime;
      if (wasPlayingRef.current) void video.play().catch(() => {});
    };
    video.addEventListener("loadedmetadata", resume, { once: true });
    return () => video.removeEventListener("loadedmetadata", resume);
    // Deliberately only re-runs when the resolved source changes (i.e. a
    // quality switch) — not on every currentTime/playing update, or this
    // would fight the video element's own natural playback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedSrc]);

  React.useEffect(() => {
    wasPlayingRef.current = playing;
  }, [playing]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "group/player relative flex items-center justify-center overflow-hidden bg-black",
        className
      )}
      onContextMenu={event => event.preventDefault()}
    >
      <video
        ref={videoRef}
        src={resolvedSrc}
        poster={poster}
        autoPlay={autoPlay}
        playsInline
        className="max-h-full max-w-full"
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={event => {
          if (!seekingRef.current) setCurrentTime(event.currentTarget.currentTime);
        }}
        onDurationChange={event => setDuration(event.currentTarget.duration)}
        onVolumeChange={event => {
          setVolume(event.currentTarget.volume);
          setMuted(event.currentTarget.muted);
        }}
      />

      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/10"
          aria-label="Play video"
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
            <Play className="ml-1 size-7" fill="currentColor" />
          </span>
        </button>
      )}

      {/* Settings live at the top-right corner, away from playback — the
          lightbox's own Close/Prev/Next chrome already occupies the outer
          top-right, this sits just inside the video frame itself so the
          two don't compete. */}
      <div
        className={cn(
          "absolute right-3 top-3 z-10 flex items-center gap-1.5 text-white opacity-100 transition-opacity",
          "md:opacity-0 md:group-hover/player:opacity-100 md:focus-within:opacity-100"
        )}
        onClick={event => event.stopPropagation()}
      >
        {isCloudinaryVideoUrl(src) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Video quality"
                className="flex size-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60"
              >
                <Settings className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {VIDEO_QUALITIES.map(option => (
                <DropdownMenuItem
                  key={option}
                  onSelect={() => setQuality(option)}
                  className={option === quality ? "font-semibold" : ""}
                >
                  {QUALITY_LABELS[option]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          className="flex size-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60"
        >
          {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
        </button>
      </div>

      {/* Playback stays at the bottom, on its own — seek bar gets a full
          row to itself so it isn't squeezed in among the buttons. */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-linear-to-t from-black/85 to-transparent px-3 pb-2.5 pt-10 text-white transition-opacity",
          "opacity-100 md:opacity-0 md:group-hover/player:opacity-100 md:focus-within:opacity-100"
        )}
        onClick={event => event.stopPropagation()}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={event => {
            seekingRef.current = true;
            setCurrentTime(Number(event.target.value));
          }}
          onMouseUp={event => {
            handleSeek(Number((event.target as HTMLInputElement).value));
            seekingRef.current = false;
          }}
          onTouchEnd={event => {
            handleSeek(Number((event.target as HTMLInputElement).value));
            seekingRef.current = false;
          }}
          className="h-1 w-full cursor-pointer accent-white"
          aria-label="Seek"
        />

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="flex size-7 shrink-0 items-center justify-center"
          >
            {playing ? <Pause className="size-4.5" /> : <Play className="size-4.5" />}
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="flex size-7 shrink-0 items-center justify-center"
            >
              {muted || volume === 0 ? <VolumeX className="size-4.5" /> : <Volume2 className="size-4.5" />}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={event => handleVolumeChange(Number(event.target.value))}
              className="h-1 w-14 cursor-pointer accent-white sm:w-20"
              aria-label="Volume"
            />
          </div>

          <span className="shrink-0 text-xs tabular-nums text-white/80">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
