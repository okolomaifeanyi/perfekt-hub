import { create } from "zustand";

// TikTok-style reel mode (VideoViewer, the /watch page) autoplays each
// video as it scrolls into view — mute is a single "do I want sound right
// now" preference for that whole session, not a per-video setting. Without
// this, each ContainedVideo tracked its own local mute state, so unmuting
// one video had no effect on the next one scrolled to, which kept starting
// muted again.
type VideoMuteStore = {
  muted: boolean;
  toggleMuted: () => void;
  setMuted: (muted: boolean) => void;
};

export const useVideoMuteStore = create<VideoMuteStore>(set => ({
  muted: true,
  toggleMuted: () => set(state => ({ muted: !state.muted })),
  setMuted: muted => set({ muted }),
}));
