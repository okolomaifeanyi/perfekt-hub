"use client";
import { create } from "zustand";
import { getFirebaseToken } from "@/lib/utils";

type FriendStatus = "none" | "following" | "friends" | "requested" | "pending";

interface FriendStore {
  statuses: Record<string, FriendStatus>;
  loading: Record<string, boolean>;
  setStatus: (uid: string, status: FriendStatus) => void;
  setLoading: (uid: string, loading: boolean) => void;
  fetchStatus: (uid: string) => Promise<void>;
  handleAction: (
    uid: string,
    action: "follow" | "unfollow" | "befriend" | "unfriend" | "disconnect"
  ) => Promise<void>;
}

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
        headers: {
          Authorization: `Bearer ${await getFirebaseToken()}`,
        },
      });
      const data = await res.json();
      if (res.ok) get().setStatus(uid, data.status);
    } catch (err) {
      console.error("fetchStatus error:", err);
    }
  },

  handleAction: async (uid, action) => {
    const { setStatus, setLoading } = get();
    setLoading(uid, true);

    try {
      const res = await fetch(`/api/friends/${uid}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await getFirebaseToken()}`,
        },
      });
      if (!res.ok) throw new Error("Action failed");

      setStatus(
        uid,
        action === "befriend"
          ? get().statuses[uid] === "pending"
            ? "friends"
            : "requested"
          : action === "follow"
          ? "following"
          : "none"
      );
    } catch (err) {
      console.error("action error:", err);
    } finally {
      setLoading(uid, false);
    }
  },
}));
