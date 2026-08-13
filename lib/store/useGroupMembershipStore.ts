import { create } from "zustand";

// Bridges group-membership state between GroupsListClient (the /discover/groups
// list, which fetches a page of groups client-side and has no idea which ones
// the current user already belongs to) and GroupDetailClient (which knows this
// accurately per-group from a fresh server fetch). Without this, joining or
// leaving on one page didn't show up on the other, and a fresh list load
// always showed "Join" even for groups the user had already joined.
type GroupMembershipState = {
  joinedIds: Set<string>;
  requestedIds: Set<string>;
  // Member-count adjustments to overlay on top of a group's server-fetched
  // membersCount, keyed by groupId. Cleared whenever a fresh list fetch
  // completes, since that fresh data already bakes in any prior deltas.
  countDeltas: Record<string, number>;
  setInitial: (joinedIds: string[], requestedIds: string[]) => void;
  markJoined: (groupId: string) => void;
  markLeft: (groupId: string) => void;
  markRequested: (groupId: string) => void;
  clearCountDeltas: () => void;
};

export const useGroupMembershipStore = create<GroupMembershipState>((set, get) => ({
  joinedIds: new Set(),
  requestedIds: new Set(),
  countDeltas: {},
  setInitial: (joinedIds, requestedIds) => {
    const state = get();
    set({
      joinedIds: new Set([...joinedIds, ...state.joinedIds]),
      requestedIds: new Set([...requestedIds, ...state.requestedIds]),
    });
  },
  markJoined: groupId => {
    const state = get();
    const joinedIds = new Set(state.joinedIds).add(groupId);
    const requestedIds = new Set(state.requestedIds);
    requestedIds.delete(groupId);
    set({
      joinedIds,
      requestedIds,
      countDeltas: { ...state.countDeltas, [groupId]: (state.countDeltas[groupId] ?? 0) + 1 },
    });
  },
  markLeft: groupId => {
    const state = get();
    const joinedIds = new Set(state.joinedIds);
    joinedIds.delete(groupId);
    set({
      joinedIds,
      countDeltas: { ...state.countDeltas, [groupId]: (state.countDeltas[groupId] ?? 0) - 1 },
    });
  },
  markRequested: groupId => {
    const state = get();
    set({ requestedIds: new Set(state.requestedIds).add(groupId) });
  },
  clearCountDeltas: () => set({ countDeltas: {} }),
}));
