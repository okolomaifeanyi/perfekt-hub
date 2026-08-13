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
let unsubUserUid: string | null = null;
let unsubMessages: (() => void) | null = null;
let unsubMessagesUid: string | null = null;
let unsubNotifications: (() => void) | null = null;
let unsubNotificationsUid: string | null = null;

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
                // Otherwise the previous account's counts stayed on screen
                // until the new account's listeners caught up.
                messageBadge: 0,
                notificationBadge: 0,
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

      // ────── LISTENERS ──────
      // Each start*Listener guards against redundant re-subscription for the
      // SAME uid (e.g. an effect re-running), but must still tear down and
      // restart when called for a DIFFERENT uid — otherwise switching
      // accounts left these bound to the previous account forever (the old
      // guard was just `if (unsub) return`, which also blocked restarting
      // for a new user), so messages/notifications/profile updates silently
      // kept reflecting whichever account was logged in first.
      startUserListener: uid => {
        if (unsubUser && unsubUserUid === uid) return;
        unsubUser?.();
        unsubUserUid = uid;
        const ref = doc(db, "users", uid);
        unsubUser = onSnapshot(ref, snap => {
          if (snap.exists()) {
            const data = snap.data() as UserProps;
            // This listener polls the DB every 3s (see the onSnapshot shim)
            // rather than pushing true realtime updates. A poll request that
            // was already in flight when the user submitted the
            // complete-profile form can resolve *after* that submit's local
            // optimistic update, still carrying the pre-submit
            // completedProfile:false snapshot — clobbering the fresh state
            // and popping the modal back open moments after it was
            // dismissed. completedProfile only ever legitimately goes
            // false -> true, never back, so once we've observed true
            // (from this snapshot or an earlier one) a stale false can't
            // downgrade it.
            const previousUser = get().user;
            const completedProfile =
              !!data.completedProfile ||
              (previousUser?.uid === snap.id && !!previousUser.completedProfile);
            set({
              user: { ...data, uid: snap.id, completedProfile },
              // Only reopen the modal when the profile is genuinely
              // incomplete — this fires on every change to the row
              // (including unrelated fields like lastSeen), so
              // unconditionally clearing the dismissal here reopened the
              // modal for users who'd already completed their profile.
              ...(completedProfile ? {} : { dismissedProfileModal: false }),
            });
          } else {
            get().clearUser();
          }
        });
      },

      startMessageListener: uid => {
        if (unsubMessages && unsubMessagesUid === uid) return;
        unsubMessages?.();
        unsubMessagesUid = uid;
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
        if (unsubNotifications && unsubNotificationsUid === uid) return;
        unsubNotifications?.();
        unsubNotificationsUid = uid;
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
        unsubUserUid = null;
        unsubMessages?.();
        unsubMessages = null;
        unsubMessagesUid = null;
        unsubNotifications?.();
        unsubNotifications = null;
        unsubNotificationsUid = null;
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
