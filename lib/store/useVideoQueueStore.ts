import { create } from "zustand";
import type { PostProps } from "@/lib/types";

type VideoQueueStore = {
  queue: PostProps[];
  activeIndex: number;
  setQueue: (queue: PostProps[], activeIndex?: number) => void;
  setActiveIndex: (index: number) => void;
  clearQueue: () => void;
};

export const useVideoQueueStore = create<VideoQueueStore>(set => ({
  queue: [],
  activeIndex: 0,
  setQueue: (queue, activeIndex = 0) => set({ queue, activeIndex }),
  setActiveIndex: index => set({ activeIndex: index }),
  clearQueue: () => set({ queue: [], activeIndex: 0 }),
}));
