"use client";

import { ReactNode, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import CompleteProfileModal from "./CompleteProfileModal";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { useUserStore } from "@/lib/store/useUserStore";
import Loader from "./Loader";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { saveOrUpdateUser, logoutClient } from "@/app/(auth)/lib/utils";
import {
  canSyncUserProfile,
  hasAuthenticatedSession,
} from "@/lib/supabase/session-status.mjs";
import {
  buildSavedAccountFromSession,
  rememberSavedAccount,
} from "@/lib/saved-accounts.mjs";

// @stream-io/video-react-sdk is a WebRTC client library — loading it during
// Next's server-side render pass (which runs even for "use client"
// components on the initial request) risks touching browser-only globals
// server-side. ssr:false keeps the whole module out of the server bundle
// for this component entirely, only ever loading it after hydration in
// the browser.
const CallingFeature = dynamic(
  () => import("@/components/calls/CallingFeature"),
  { ssr: false }
);

const ClientLayout = ({ children }: { children: ReactNode }) => {
  const {
    user,
    authReady,
    clearUser,
    setAuthReady,
    globalLoading,
    setGlobalLoading,
    dismissedProfileModal,
    setDismissedProfileModal,
    startUserListener,
    startMessageListener,
    startNotificationListener,
    stopListeners,
    setUser,
  } = useUserStore(state => state);

  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const router = useRouter();

  useEffect(() => {
    if (isAuthPage) {
      setAuthReady(false);
      setGlobalLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let active = true;
    setAuthReady(false);
    setGlobalLoading(true);

    const bootstrap = async () => {
      try {
        // getSession() reads the locally-persisted session (fast, no network
        // round trip). Using getUser() here instead races the client's own
        // hydration right after an OAuth redirect, since it depends on a
        // fresh network call succeeding before the session has settled.
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        const currentUser = session?.user ?? null;

        if (!active) return;

        if (!currentUser) {
          clearUser();
          setAuthReady(true);
          setGlobalLoading(false);
          return;
        }

        const canSync = canSyncUserProfile(currentUser, session);
        const profile = await saveOrUpdateUser(currentUser);
        if (!active) return;

        // saveOrUpdateUser falls back to a locally-built profile (with no
        // completedProfile field at all) when the network call to fetch the
        // real one fails — e.g. the connection drops. Coercing that missing
        // field straight to `false` silently downgraded an already-complete
        // profile to "incomplete" on any offline blip, popping the
        // complete-your-profile modal for users who'd long since dismissed
        // it. Preserve whatever was last known instead of assuming the
        // worst when the fetch didn't actually tell us anything new.
        const previousUser = useUserStore.getState().user;
        setUser({
          uid: currentUser.id,
          email: currentUser.email ?? "",
          username: String(profile.username ?? ""),
          fullName: String(profile.fullName ?? ""),
          photoURL: String(profile.photoURL ?? ""),
          completedProfile:
            profile.completedProfile !== undefined
              ? Boolean(profile.completedProfile)
              : (previousUser?.uid === currentUser.id &&
                  previousUser?.completedProfile) ||
                false,
          postsCount: Number(profile.postsCount ?? 0),
          followersCount: Number(profile.followersCount ?? 0),
          followingCount: Number(profile.followingCount ?? 0),
          friendsCount: Number(profile.friendsCount ?? 0),
          lastSeen: profile.lastSeen ?? null,
        });

        if (session) {
          rememberSavedAccount(window.localStorage, {
            ...buildSavedAccountFromSession({
              user: currentUser,
              session,
              profile,
            }),
            lastUsedAt: new Date().toISOString(),
          });
        }

        if (hasAuthenticatedSession(session) && canSync) {
          startUserListener(currentUser.id);
          startMessageListener(currentUser.id);
          startNotificationListener(currentUser.id);
          setAuthReady(true);
        }

        if (!hasAuthenticatedSession(session) || !canSync) {
          setAuthReady(false);
        }
      } catch (error) {
        console.error("Failed to bootstrap auth state:", error);
        clearUser();
        setAuthReady(true);
      } finally {
        if (active) {
          setGlobalLoading(false);
        }
      }
    };

    void bootstrap();

    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;

      if (!session?.user) {
        clearUser();
        setAuthReady(true);
        stopListeners();
        setGlobalLoading(false);
        return;
      }

      const canSync = canSyncUserProfile(session.user, session);
      const profile = await saveOrUpdateUser(session.user);
      if (!active) return;

      const previousUser = useUserStore.getState().user;
      setUser({
        uid: session.user.id,
        email: session.user.email ?? "",
        username: String(profile.username ?? ""),
        fullName: String(profile.fullName ?? ""),
        photoURL: String(profile.photoURL ?? ""),
        completedProfile:
          profile.completedProfile !== undefined
            ? Boolean(profile.completedProfile)
            : (previousUser?.uid === session.user.id &&
                previousUser?.completedProfile) ||
              false,
        postsCount: Number(profile.postsCount ?? 0),
        followersCount: Number(profile.followersCount ?? 0),
        followingCount: Number(profile.followingCount ?? 0),
        friendsCount: Number(profile.friendsCount ?? 0),
        lastSeen: profile.lastSeen ?? null,
      });

      rememberSavedAccount(window.localStorage, {
        ...buildSavedAccountFromSession({
          user: session.user,
          session,
          profile,
        }),
        lastUsedAt: new Date().toISOString(),
      });

      if (hasAuthenticatedSession(session) && canSync) {
        startUserListener(session.user.id);
        startMessageListener(session.user.id);
        startNotificationListener(session.user.id);
      }

      setAuthReady(hasAuthenticatedSession(session) && canSync);
      setGlobalLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
      stopListeners();
    };
  }, [
    isAuthPage,
    clearUser,
    setAuthReady,
    setGlobalLoading,
    setUser,
    startMessageListener,
    startNotificationListener,
    startUserListener,
    stopListeners,
  ]);

  useEffect(() => {
    // `authReady` gates this deliberately. logoutClient() calls
    // supabase.auth.signOut(), which DELETES the session cookies — so firing it
    // during the initial indeterminate window (where `user` is still null and
    // `globalLoading` is still the stale `false` from this render) would destroy
    // a session that had just been established, e.g. right after an OAuth
    // redirect. Only sign out once auth has actually resolved to "no session".
    if (!isAuthPage && authReady && globalLoading === false && !user) {
      void logoutClient(router);
    }
  }, [authReady, globalLoading, isAuthPage, router, user]);

  return (
    <ThemeProvider defaultTheme="system">
      {!isAuthPage && globalLoading && <Loader />}

      {!isAuthPage &&
        !globalLoading &&
        user &&
        !user.completedProfile &&
        !dismissedProfileModal && (
          <CompleteProfileModal
            onClose={() => setDismissedProfileModal(true)}
          />
        )}

      {(isAuthPage || !globalLoading) && children}

      {!isAuthPage && user && <CallingFeature />}

      <Toaster />
    </ThemeProvider>
  );
};

export default ClientLayout;
