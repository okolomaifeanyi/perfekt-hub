import { create } from "zustand";
import type { GroupMemberProps, GroupProps } from "@/app/actions/groups";

type GroupStore = {
  group: GroupProps | null;
  members: GroupMemberProps[];
  myRole: "admin" | "member" | null;
  setGroupContext: (group: GroupProps, members: GroupMemberProps[], myRole: "admin" | "member" | null) => void;
  updateMembers: (members: GroupMemberProps[]) => void;
  clearGroupContext: () => void;
};

export const useGroupStore = create<GroupStore>(set => ({
  group: null,
  members: [],
  myRole: null,
  setGroupContext: (group, members, myRole) => set({ group, members, myRole }),
  updateMembers: members => set({ members }),
  clearGroupContext: () => set({ group: null, members: [], myRole: null }),
}));
