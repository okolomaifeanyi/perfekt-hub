import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserProps } from "../types";
import { db } from "@/lib/supabase";
import { collection, doc, onSnapshot, query, where } from "@/lib/supabase";
import { getSmartSuggestions } from "@/components/Features/follow/actions";

type UserState = {
  user: UserProps | null;
  suggestions: UserProps[];
  visibleSuggestions: UserProps[]; // Always top 3 or rotated
  currentIndex: number; // For rotation
  authReady: boolean;

  globalLoading: boolean;

  // Bumped whenever the current user's follow/friend graph changes, so feeds
  // (which cache the follow list server-side) know to refetch instead of
  // waiting for the next poll cycle or a page reload.
  feedRefreshSignal: number;
  bumpFeedRefreshSignal: () => void;

  // Badges
  messageBadge: number;
  notificationBadge: number;

  // Profile modal
  dismissedProfileModal: boolean;
  setDismissedProfileModal: (value: boolean) => void;

  // Core
  setUser: (user: UserProps) => void;
  clearUser: () => void;
  setAuthReady: (authReady: boolean) => void;
  setGlobalLoading: (globalLoading: boolean) => void;

  // Suggestions
  setSuggestions: (suggestions: UserProps[]) => void;
  clearSuggestions: () => void;
  rotateVisibleSuggestions: () => void;
  fetchSmartSuggestions: () => Promise<void>;
  refreshSuggestions: () => Promise<void>; // Manual refresh

  // Listeners
  startUserListener: (uid: string) => void;
  startMessageListener: (uid: string) => void;
  startNotificationListener: (uid: string) => void;
  stopListeners: () => void;
};

let unsubUser: (() => void) | null = null;
let unsubMessages: (() => void) | null = null;
let unsubNotifications: (() => void) | null = null;

const ITEMS_TO_SHOW = 3;

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      suggestions: [],
      visibleSuggestions: [],
      currentIndex: 0,
      authReady: false,
      globalLoading: false,
      feedRefreshSignal: 0,
      bumpFeedRefreshSignal: () =>
        set(state => ({ feedRefreshSignal: state.feedRefreshSignal + 1 })),
      messageBadge: 0,
      notificationBadge: 0,
      dismissedProfileModal: false,

      setDismissedProfileModal: value => set({ dismissedProfileModal: value }),

      setUser: user => {
        // setUser fires on every auth-state event, including background
        // token refreshes for the *same already-logged-in* user (Supabase
        // rotates tokens periodically) — resetting dismissedProfileModal and
        // suggestions unconditionally made the "complete your profile"
        // prompt reappear at effectively random moments and re-fetched
        // suggestions needlessly. Only reset them when the user actually
        // changes (fresh login, or switching accounts).
        const isDifferentUser = get().user?.uid !== user?.uid;

        set({
          user,
          ...(isDifferentUser
            ? {
                dismissedProfileModal: false,
                suggestions: [],
                visibleSuggestions: [],
                currentIndex: 0,
              }
            : {}),
        });
        if (user?.uid && isDifferentUser) {
          get().fetchSmartSuggestions();
        }
      },

      clearUser: () => {
        set({
          user: null,
          authReady: false,
          messageBadge: 0,
          notificationBadge: 0,
          dismissedProfileModal: false,
          suggestions: [],
          visibleSuggestions: [],
          currentIndex: 0,
        });
        get().stopListeners();
      },

      setAuthReady: authReady => set({ authReady }),

      setGlobalLoading: globalLoading => set({ globalLoading }),

      setSuggestions: suggestions => {
        const top = suggestions.slice(0, 12); // Always keep top 12
        set({
          suggestions: top,
          visibleSuggestions: top.slice(0, ITEMS_TO_SHOW),
          currentIndex: 0,
        });
      },

      clearSuggestions: () =>
        set({ suggestions: [], visibleSuggestions: [], currentIndex: 0 }),

      fetchSmartSuggestions: async () => {
        const user = get().user;
        if (!user?.uid) return;

        try {
          const raw = await getSmartSuggestions(user.uid);
          get().setSuggestions(raw);
        } catch (err) {
          console.error("Failed to load suggestions", err);
        }
      },

      /** Rotate: show next 3 in list */
      rotateVisibleSuggestions: () => {
        const { suggestions, currentIndex } = get();
        if (suggestions.length === 0) {
          get().refreshSuggestions();
          return;
        }

        const nextIndex = (currentIndex + ITEMS_TO_SHOW) % suggestions.length;
        const nextThree = suggestions.slice(
          nextIndex,
          nextIndex + ITEMS_TO_SHOW
        );
        const wrapped =
          nextThree.length < ITEMS_TO_SHOW
            ? [
                ...nextThree,
                ...suggestions.slice(0, ITEMS_TO_SHOW - nextThree.length),
              ]
            : nextThree;

        set({
          visibleSuggestions: wrapped,
          currentIndex: nextIndex,
        });
      },

      /** Force refresh suggestions (e.g. when exhausted) */
      refreshSuggestions: async () => {
        set({ suggestions: [], visibleSuggestions: [], currentIndex: 0 });
        await get().fetchSmartSuggestions();
      },

      // â”€â”€â”€â”€â”€â”€ LISTENERS â”€â”€â”€â”€â”€â”€
      startUserListener: uid => {
        if (unsubUser) return;
        const ref = doc(db, "users", uid);
        unsubUser = onSnapshot(ref, snap => {
          if (snap.exists()) {
            set({
              user: { ...(snap.data() as UserProps), uid: snap.id },
              dismissedProfileModal: false,
            });
          } else {
            get().clearUser();
          }
        });
      },

      startMessageListener: uid => {
        if (unsubMessages) return;
        const q = query(
          collection(db, "conversations"),
          where("participants", "array-contains", uid)
        );
        unsubMessages = onSnapshot(q, snap => {
          let total = 0;
          snap.forEach(doc => {
            const data = doc.data();
            total += data.unreadCount?.[uid] ?? 0;
          });
          set({ messageBadge: total });
        });
      },

      startNotificationListener: uid => {
        if (unsubNotifications) return;
        const q = query(
          collection(db, "notifications"),
          where("recipientUid", "==", uid)
        );
        unsubNotifications = onSnapshot(q, snap => {
          let total = 0;
          snap.forEach(doc => {
            const data = doc.data();
            if (!data.read) total++;
          });
          set({ notificationBadge: total });
        });
      },

      stopListeners: () => {
        unsubUser?.();
        unsubUser = null;
        unsubMessages?.();
        unsubMessages = null;
        unsubNotifications?.();
        unsubNotifications = null;
      },
    }),
    {
      name: "user-store",
      partialize: state => ({
        user: state.user,
        dismissedProfileModal: state.dismissedProfileModal,
        // DO NOT persist suggestions or index
      }),
    }
  )
);
