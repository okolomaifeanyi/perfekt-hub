"use client";
import { create } from "zustand";
import { getFirebaseToken } from "@/lib/utils";
import { toast } from "sonner";

type FriendStatus = "none" | "following" | "friends" | "requested" | "pending";
type Action = "follow" | "unfollow" | "befriend" | "unfriend" | "disconnect" | "accept" | "cancel";

interface FriendStore {
  statuses: Record<string, FriendStatus>;
  loading: Record<string, boolean>;
  setStatus: (uid: string, status: FriendStatus) => void;
  setLoading: (uid: string, loading: boolean) => void;
  fetchStatus: (uid: string) => Promise<void>;
  handleAction: (uid: string, action: Action) => Promise<void>;
}

const optimisticStatus = (prev: FriendStatus, action: Action): FriendStatus => {
  switch (action) {
    case "befriend":
      // if you had an incoming request ("pending"), accepting makes you friends; else you sent a request
      return prev === "pending" ? "friends" : "requested";
    case "follow":
      return "following";
    case "unfollow":
    case "unfriend":
    case "disconnect":
      return "none";
    default:
      return prev;
  }
};

const successMsgFor = (action: Action, newStatus: FriendStatus) => {
  switch (action) {
    case "befriend":
      return newStatus === "friends"
        ? "Friend request accepted"
        : "Friend request sent";
    case "unfriend":
      return "Unfriended successfully";
    case "follow":
      return "Now following";
    case "unfollow":
      return "Unfollowed successfully";
    case "disconnect":
      return "Disconnected successfully";
  }
};

const errorMsgFor = (action: Action) => {
  switch (action) {
    case "befriend":
      return "Failed to send/accept friend request — reverted";
    case "unfriend":
      return "Failed to unfriend — reverted";
    case "follow":
      return "Failed to follow — reverted";
    case "unfollow":
      return "Failed to unfollow — reverted";
    case "disconnect":
      return "Failed to disconnect — reverted";
  }
};

export const useFriendStore = create<FriendStore>((set, get) => ({
  statuses: {},
  loading: {},

  setStatus: (uid, status) =>
    set(state => ({
      statuses: { ...state.statuses, [uid]: status },
    })),

  setLoading: (uid, loading) =>
    set(state => ({
      loading: { ...state.loading, [uid]: loading },
    })),

  fetchStatus: async uid => {
    try {
      const res = await fetch(`/api/friends/${uid}/status`, {
        headers: { Authorization: `Bearer ${await getFirebaseToken()}` },
      });
      const data = await res.json();

      if (res.ok) get().setStatus(uid, data.status);
      else toast.error("Failed to fetch connection status");
    } catch (err) {
      console.error("fetchStatus error:", err);
      toast.error("Failed to fetch connection status");
    }
  },

  handleAction: async (uid, action) => {
    const { statuses, setStatus, setLoading } = get();
    if (get().loading[uid]) return; // dedupe clicks per uid

    const prev = statuses[uid] ?? "none";
    const optimistic = optimisticStatus(prev, action);

    // 🔥 optimistic update first
    setStatus(uid, optimistic);
    setLoading(uid, true);

    try {
      const res = await fetch(`/api/friends/${uid}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${await getFirebaseToken()}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(`Action ${action} failed`);

      // ensure client matches backend truth
      if (data.status) setStatus(uid, data.status);

      toast.success(successMsgFor(action, data.status ?? optimistic));
    } catch (err) {
      console.error("action error:", err);
      // rollback
      setStatus(uid, prev);
      toast.error(errorMsgFor(action));
    } finally {
      setLoading(uid, false);
    }
  },
}));
