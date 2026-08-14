"use client";

import { ReactNode, useEffect, useState } from "react";
import { StreamVideo, StreamVideoClient } from "@stream-io/video-react-sdk";
import { useUserStore } from "@/lib/store/useUserStore";
import { getStreamToken } from "@/app/actions/stream";

// Mounted once near the app root (ClientLayout) so an incoming call can ring
// from any page, not just while Messages or a group's audio room happens to
// be open — mirrors why startUserListener/startMessageListener also live at
// that level rather than per-page.
export function StreamVideoProvider({ children }: { children: ReactNode }) {
  const uid = useUserStore(state => state.user?.uid);
  const authReady = useUserStore(state => state.authReady);
  const [client, setClient] = useState<StreamVideoClient | null>(null);

  useEffect(() => {
    if (!authReady || !uid) {
      setClient(null);
      return;
    }

    let active = true;
    let createdClient: StreamVideoClient | null = null;

    getStreamToken()
      .then(({ apiKey, token, uid: tokenUid }) => {
        if (!active) return;
        // Read fresh (non-reactive) profile fields at connect time rather
        // than depending on them in the effect — this must only reconnect
        // when the ACCOUNT changes, not on every profile edit, or an active
        // call would get torn down mid-conversation whenever the user's
        // name/photo happened to update.
        const currentUser = useUserStore.getState().user;
        createdClient = new StreamVideoClient(apiKey);
        return createdClient
          .connectUser(
            {
              id: tokenUid,
              name: currentUser?.fullName || currentUser?.username || tokenUid,
              image: currentUser?.photoURL || undefined,
            },
            token
          )
          .then(() => {
            if (active) {
              setClient(createdClient);
            } else {
              void createdClient?.disconnectUser();
            }
          });
      })
      .catch(err => {
        // Calling is an additive feature — if Stream is misconfigured or the
        // token request fails, the rest of the app must keep working.
        console.error("Stream Video connect failed:", err);
      });

    return () => {
      active = false;
      setClient(null);
      void createdClient?.disconnectUser();
    };
  }, [authReady, uid]);

  // This is the actual bug that took the whole app down: children here are
  // always calling-specific UI (IncomingCallBanner, ActiveCallBar — see
  // CallingFeature, the only consumer of this component), and those call
  // Stream hooks like useCalls() unconditionally at their top level. Those
  // hooks don't fail soft — they throw synchronously when rendered without
  // a real <StreamVideo> context above them, which is exactly what
  // rendering `children` here did during the window before the client
  // finishes connecting (every render until the connectUser() promise
  // resolves). An uncaught error with no error boundary above it unmounts
  // the entire React tree back to the root, not just this component —
  // which is why a crash in a small notification banner took down every
  // page in the app. Render nothing until there's a real client instead.
  if (!client) return null;

  return <StreamVideo client={client}>{children}</StreamVideo>;
}
