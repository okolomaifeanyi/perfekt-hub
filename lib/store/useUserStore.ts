import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserProps } from "../types";

type UserState = {
  user: UserProps | null;
  suggestions: UserProps[];
  globalLoading: boolean;
  setUser: (user: UserProps) => void;
  clearUser: () => void;
  setGlobalLoading: (globalLoading: boolean) => void;
  setSuggestions: (suggestions: UserProps[]) => void;
  clearSuggestions: () => void;
  visibleSuggestions: UserProps[];
  rotateVisibleSuggestions: () => void;
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      suggestions: [],
      globalLoading: false,
      visibleSuggestions: [],
      setUser: user => set({ user }),
      clearUser: () => set({ user: null }),
      setGlobalLoading: globalLoading => set({ globalLoading }),
      setSuggestions: suggestions => set({ suggestions }),
      clearSuggestions: () => set({ suggestions: [] }),
      rotateVisibleSuggestions: () => {
        const shuffled = [...get().suggestions].sort(() => 0.5 - Math.random());
        set({ visibleSuggestions: shuffled.slice(0, 6) });
      },
    }),
    {
      name: "user-store",
      partialize: state => ({
        user: state.user,
      }),
    }
  )
);
