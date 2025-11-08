// lib/store/useUserStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserProps } from "../types";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { getSmartSuggestions } from "@/components/Features/follow/actions";

type UserState = {
  user: UserProps | null;
  suggestions: UserProps[];
  visibleSuggestions: UserProps[];
  seenSuggestionUids: Set<string>;
  globalLoading: boolean;

  // Badges
  messageBadge: number;
  notificationBadge: number;

  // Profile modal
  dismissedProfileModal: boolean;
  setDismissedProfileModal: (value: boolean) => void;

  // Core
  setUser: (user: UserProps) => void;
  clearUser: () => void;
  setGlobalLoading: (globalLoading: boolean) => void;

  // Suggestions
  setSuggestions: (suggestions: UserProps[]) => void;
  clearSuggestions: () => void;
  rotateVisibleSuggestions: () => void;
  fetchSmartSuggestions: () => Promise<void>;
  markSuggestionSeen: (uid: string) => void;
  autoRefreshIfEmpty: () => Promise<void>;

  // Listeners
  startUserListener: (uid: string) => void;
  startMessageListener: (uid: string) => void;
  startNotificationListener: (uid: string) => void;
  stopListeners: () => void;
};

let unsubUser: (() => void) | null = null;
let unsubMessages: (() => void) | null = null;
let unsubNotifications: (() => void) | null = null;

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      suggestions: [],
      visibleSuggestions: [],
      seenSuggestionUids: new Set<string>(),
      globalLoading: false,
      messageBadge: 0,
      notificationBadge: 0,
      dismissedProfileModal: false,

      setDismissedProfileModal: value => set({ dismissedProfileModal: value }),

      setUser: user => {
        set({
          user,
          dismissedProfileModal: false,
          seenSuggestionUids: new Set(),
          suggestions: [],
          visibleSuggestions: [],
        });
        if (user?.uid) get().fetchSmartSuggestions();
      },

      clearUser: () => {
        set({
          user: null,
          messageBadge: 0,
          notificationBadge: 0,
          dismissedProfileModal: false,
          suggestions: [],
          visibleSuggestions: [],
          seenSuggestionUids: new Set(),
        });
        get().stopListeners();
      },

      setGlobalLoading: globalLoading => set({ globalLoading }),

      setSuggestions: suggestions => set({ suggestions }),
      clearSuggestions: () => set({ suggestions: [], visibleSuggestions: [] }),

      markSuggestionSeen: uid =>
        set(state => ({
          seenSuggestionUids: new Set([...state.seenSuggestionUids, uid]),
        })),

      fetchSmartSuggestions: async () => {
        const user = get().user;
        if (!user?.uid) return;

        try {
          const raw = await getSmartSuggestions(user.uid);
          const seen = get().seenSuggestionUids;
          const filtered = raw.filter(u => !seen.has(u.uid));

          set({
            suggestions: filtered,
            visibleSuggestions: filtered.slice(0, 3),
          });

          // Auto-refresh if still empty after filtering
          if (filtered.length === 0) {
            await get().autoRefreshIfEmpty();
          }
        } catch (err) {
          console.error("Failed to load suggestions", err);
        }
      },

      /** Called when no new suggestions → reset seen + fetch fresh */
      autoRefreshIfEmpty: async () => {
        set({ seenSuggestionUids: new Set() });
        await get().fetchSmartSuggestions();
      },

      rotateVisibleSuggestions: () => {
        const { suggestions } = get();
        if (suggestions.length === 0) {
          get().autoRefreshIfEmpty();
          return;
        }
        const shuffled = [...suggestions].sort(() => 0.5 - Math.random());
        set({ visibleSuggestions: shuffled.slice(0, 3) });
      },

      // ────── LISTENERS ──────
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
        seenSuggestionUids: Array.from(state.seenSuggestionUids),
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<UserState> & {
          seenSuggestionUids?: string[];
        };
        return {
          ...current,
          ...p,
          seenSuggestionUids: new Set(p.seenSuggestionUids ?? []),
        };
      },
    }
  )
);
