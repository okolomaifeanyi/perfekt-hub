"use client";

import { StreamVideoProvider } from "./StreamVideoProvider";
import { IncomingCallBanner } from "./IncomingCallBanner";
import { ActiveCallBar } from "./ActiveCallBar";

// Single entry point for the whole calling feature, loaded via
// next/dynamic({ ssr: false }) from ClientLayout — see the comment there
// for why this needs to stay out of the server render pass entirely.
export default function CallingFeature() {
  return (
    <StreamVideoProvider>
      <IncomingCallBanner />
      <ActiveCallBar />
    </StreamVideoProvider>
  );
}
