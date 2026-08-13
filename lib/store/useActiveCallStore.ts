import { create } from "zustand";
import type { Call } from "@stream-io/video-react-sdk";

// Whichever call the user has actually joined (accepted a 1:1 ring, or
// joined a group audio room) lives here so the persistent call bar and
// controls can render from anywhere in the tree — the page that started
// the call doesn't have to stay mounted for the call to keep going.
type ActiveCallState = {
  call: Call | null;
  setCall: (call: Call | null) => void;
};

export const useActiveCallStore = create<ActiveCallState>(set => ({
  call: null,
  setCall: call => set({ call }),
}));
