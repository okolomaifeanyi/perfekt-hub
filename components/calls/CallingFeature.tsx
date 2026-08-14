"use client";

import { StreamVideoProvider } from "./StreamVideoProvider";
import { IncomingCallBanner } from "./IncomingCallBanner";
import { ActiveCallBar } from "./ActiveCallBar";

// Single entry point for the whole calling feature, loaded via
// next/dynamic({ ssr: false }) from ClientLayout — see the comment there
// for why this needs to stay out of the server render pass entirely.
// Mounted as a sibling of the app's real content, not a wrapper around it
// — call-initiating UI elsewhere (DirectCallButton, group audio rooms)
// gets the connected client from useStreamClientStore instead of needing
// to live inside this subtree. See StreamVideoProvider for why.
export default function CallingFeature() {
  return (
    <StreamVideoProvider>
      <IncomingCallBanner />
      <ActiveCallBar />
    </StreamVideoProvider>
  );
}
