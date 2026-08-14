import { create } from "zustand";
import type { StreamVideoClient } from "@stream-io/video-react-sdk";

// Lets call-initiating UI (DirectCallButton, group audio room join buttons)
// read the connected Stream client from anywhere in the tree via a plain
// store, instead of through @stream-io/video-react-sdk's own React Context
// (useStreamVideoClient()). The SDK's context only resolves for descendants
// of a mounted <StreamVideo> provider, and that provider is loaded via
// next/dynamic({ ssr: false }) — wrapping the whole app in it would gate
// every page's real content behind that chunk loading first. A store has
// no such tree-position or SSR requirement: StreamVideoProvider sets it
// once connected, call buttons anywhere just read it.
type StreamClientState = {
  client: StreamVideoClient | null;
  setClient: (client: StreamVideoClient | null) => void;
};

export const useStreamClientStore = create<StreamClientState>(set => ({
  client: null,
  setClient: client => set({ client }),
}));
