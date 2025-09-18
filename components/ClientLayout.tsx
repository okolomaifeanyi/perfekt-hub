"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import CompleteProfileModal from "./CompleteProfileModal";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { useUserStore } from "@/lib/store/useUserStore";
import { logoutClient } from "@/app/(auth)/lib/utils";
import Loader from "./Loader";

import { auth } from "@/lib/firebase";
import { signInWithCustomToken, onAuthStateChanged } from "firebase/auth";

const ClientLayout = ({ children }: { children: ReactNode }) => {
  const {
    user,
    clearUser,
    globalLoading,
    setGlobalLoading,
    dismissedProfileModal,
    setDismissedProfileModal,
    startUserListener,
    startMessageListener,
    startNotificationListener,
    stopListeners,
  } = useUserStore(state => state);

  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const router = useRouter();

  useEffect(() => {
    if (isAuthPage) {
      setGlobalLoading(false);
      return;
    }

    setGlobalLoading(true);

    const unsubscribeAuth = onAuthStateChanged(auth, async currentUser => {
      // no client user yet → try server-issued custom token
      if (!currentUser) {
        try {
          const tokenRes = await fetch("/api/firebase-token", {
            method: "POST",
          });
          if (!tokenRes.ok) throw new Error("Failed to fetch Firebase token");

          const { token } = await tokenRes.json();
          await signInWithCustomToken(auth, token);
          // onAuthStateChanged will fire again after sign-in
          return;
        } catch (err) {
          console.error("Auth sync failed:", err);
          await logoutClient(router);
          clearUser();
          stopListeners();
          setGlobalLoading(false);
          return;
        }
      }

      // we now have a signed-in user
      const uid = currentUser.uid;

      // start real-time listeners tied to UID
      startUserListener(uid); // 🔹 Firestore user doc
      startMessageListener(uid);
      startNotificationListener(uid);

      setGlobalLoading(false);
    });

    return () => {
      unsubscribeAuth();
      stopListeners();
    };
  }, [
    isAuthPage,
    router,
    setGlobalLoading,
    clearUser,
    startUserListener,
    startMessageListener,
    startNotificationListener,
    stopListeners,
  ]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
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

      <Toaster />
    </ThemeProvider>
  );
};

export default ClientLayout;
