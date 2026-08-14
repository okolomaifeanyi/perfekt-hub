"use client";

import { ReactNode, useEffect, useState } from "react";
import { StreamVideo, StreamVideoClient } from "@stream-io/video-react-sdk";
import { useUserStore } from "@/lib/store/useUserStore";
import { useStreamClientStore } from "@/lib/store/useStreamClientStore";
import { getStreamToken } from "@/app/actions/stream";

// Mounted once near the app root (ClientLayout) as a sibling of the app's
// real content, not a wrapper around it — see useStreamClientStore for why
// call-initiating UI elsewhere (DirectCallButton, group audio rooms) reads
// the connected client from that store instead of depending on being a
// descendant of this component. `children` here is only ever
// IncomingCallBanner/ActiveCallBar (see CallingFeature), so an incoming
// call can still ring from any page without the rest of the app's content
// being gated behind this being dynamically-loaded (ssr:false) first.
export function StreamVideoProvider({ children }: { children: ReactNode }) {
  const uid = useUserStore(state => state.user?.uid);
  const authReady = useUserStore(state => state.authReady);
  const setStoredClient = useStreamClientStore(state => state.setClient);
  const [client, setClient] = useState<StreamVideoClient | null>(null);

  useEffect(() => {
    if (!authReady || !uid) {
      setClient(null);
      setStoredClient(null);
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
              setStoredClient(createdClient);
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
      setStoredClient(null);
      void createdClient?.disconnectUser();
    };
  }, [authReady, uid, setStoredClient]);

  // This is the actual bug that took the whole app down once already:
  // `children` here is always calling-specific UI (IncomingCallBanner,
  // ActiveCallBar), and those call Stream hooks like useCalls()
  // unconditionally at their top level. Those hooks don't fail soft — they
  // throw synchronously when rendered without a real <StreamVideo> context
  // above them, which is exactly what rendering `children` here did during
  // the window before the client finishes connecting. An uncaught error
  // with no error boundary above it unmounts the entire React tree back to
  // the root, not just this component. Render nothing until there's a real
  // client instead.
  if (!client) return null;

  return <StreamVideo client={client}>{children}</StreamVideo>;
}
