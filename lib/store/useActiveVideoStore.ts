import { create } from "zustand";

// Only one video across the whole app should ever be playing at a time —
// matches how Twitter/Instagram/Facebook feeds behave — instead of every
// autoplaying video in the timeline (or every video in a multi-video post)
// competing for attention and audio simultaneously. Each ContainedVideo
// instance claims this when it starts playing and releases it when it
// stops; any instance that isn't the current holder pauses itself in
// response to the holder changing.
type ActiveVideoStore = {
  activeId: string | null;
  claim: (id: string) => void;
  release: (id: string) => void;
};

export const useActiveVideoStore = create<ActiveVideoStore>((set, get) => ({
  activeId: null,
  claim: id => set({ activeId: id }),
  release: id => {
    if (get().activeId === id) set({ activeId: null });
  },
}));
