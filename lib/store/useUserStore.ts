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
  globalLoading: boolean;

  // 🔹 Badges
  messageBadge: number;
  notificationBadge: number;

  // 🔹 Profile completion modal state
  dismissedProfileModal: boolean;
  setDismissedProfileModal: (value: boolean) => void;

  // 🔹 Core actions
  setUser: (user: UserProps) => void;
  clearUser: () => void;
  setGlobalLoading: (globalLoading: boolean) => void;

  // 🔹 Suggestions
  setSuggestions: (suggestions: UserProps[]) => void;
  clearSuggestions: () => void;
  rotateVisibleSuggestions: () => void;
  fetchSmartSuggestions: () => Promise<void>;

  // 🔹 Realtime listeners
  startUserListener: (uid: string) => void;
  startMessageListener: (uid: string) => void;
  startNotificationListener: (uid: string) => void;
  stopListeners: () => void;
};

// Keep unsub references outside the store
let unsubUser: (() => void) | null = null;
let unsubMessages: (() => void) | null = null;
let unsubNotifications: (() => void) | null = null;

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      suggestions: [],
      visibleSuggestions: [],
      globalLoading: false,
      messageBadge: 0,
      notificationBadge: 0,

      // 🔹 Persisted modal dismissal flag
      dismissedProfileModal: false,
      setDismissedProfileModal: value => set({ dismissedProfileModal: value }),

      // In setUser
      setUser: user => {
        set({ user, dismissedProfileModal: false });
        // Only fetch if logged in
        if (user?.uid) {
          get().fetchSmartSuggestions();
        }
      },
      clearUser: () => {
        set({
          user: null,
          messageBadge: 0,
          notificationBadge: 0,
          dismissedProfileModal: false,
        });
        get().stopListeners();
      },
      setGlobalLoading: globalLoading => set({ globalLoading }),

      // 🔹 Suggestions helpers
      setSuggestions: suggestions => set({ suggestions }),
      clearSuggestions: () => set({ suggestions: [] }),

      // In fetchSmartSuggestions
      fetchSmartSuggestions: async () => {
        const user = get().user;
        if (!user?.uid) {
          console.log("No UID → skip suggestions");
          return;
        }
        console.log("Fetching suggestions for", user.uid);
        try {
          const suggestions = await getSmartSuggestions(user.uid);
          console.log("Got suggestions:", suggestions.length);
          set({ suggestions, visibleSuggestions: suggestions.slice(0, 3) });
        } catch (err) {
          console.error("Failed to load suggestions", err);
        }
      },
      rotateVisibleSuggestions: () => {
        const shuffled = [...get().suggestions].sort(() => 0.5 - Math.random());
        set({ visibleSuggestions: shuffled.slice(0, 3) });
      },

      // 🔹 User doc listener
      startUserListener: uid => {
        if (unsubUser) return; // already active
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
            total += data.unreadCount?.[uid] || 0;
          });
          set({ messageBadge: total });
        });
      },

      // 🔹 Notifications badge listener
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

      // 🔹 Cleanup all listeners
      stopListeners: () => {
        if (unsubUser) {
          unsubUser();
          unsubUser = null;
        }
        if (unsubMessages) {
          unsubMessages();
          unsubMessages = null;
        }
        if (unsubNotifications) {
          unsubNotifications();
          unsubNotifications = null;
        }
      },
    }),
    {
      name: "user-store",
      partialize: state => ({
        user: state.user,
        dismissedProfileModal: state.dismissedProfileModal,
      }),
    }
  )
);
