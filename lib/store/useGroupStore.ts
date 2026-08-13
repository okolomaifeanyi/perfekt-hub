import { create } from "zustand";
import type { GroupFileProps, GroupMemberProps, GroupProps } from "@/app/actions/groups";

type GroupStore = {
  group: GroupProps | null;
  members: GroupMemberProps[];
  files: GroupFileProps[];
  myRole: "admin" | "member" | null;
  setGroupContext: (
    group: GroupProps,
    members: GroupMemberProps[],
    myRole: "admin" | "member" | null,
    files?: GroupFileProps[]
  ) => void;
  updateMembers: (members: GroupMemberProps[]) => void;
  updateFiles: (files: GroupFileProps[]) => void;
  clearGroupContext: () => void;
};

export const useGroupStore = create<GroupStore>(set => ({
  group: null,
  members: [],
  files: [],
  myRole: null,
  setGroupContext: (group, members, myRole, files = []) => set({ group, members, myRole, files }),
  updateMembers: members => set({ members }),
  updateFiles: files => set({ files }),
  clearGroupContext: () => set({ group: null, members: [], myRole: null, files: [] }),
}));
