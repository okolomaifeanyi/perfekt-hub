"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import CompleteProfileModal from "./CompleteProfileModal";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { useUserStore } from "@/lib/store/useUserStore";
import { logoutClient } from "@/app/(auth)/lib/utils";
import Loader from "./Loader";

import { auth } from "@/lib/firebase"; // client-side Firebase
import { signInWithCustomToken } from "firebase/auth";

const ClientLayout = ({ children }: { children: ReactNode }) => {
  const [showCompleteProfileModal, setShowCompleteProfileModal] =
    useState(false);

  const {
    setUser,
    clearUser,
    globalLoading,
    setGlobalLoading,
    setSuggestions,
  } = useUserStore(state => state);

  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();

    const checkSession = async () => {
      if (isAuthPage) {
        setGlobalLoading(false);
        return;
      }

      setGlobalLoading(true);

      try {
        const res = await fetch("/api/user-profile", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Not logged in");

        const data = await res.json();
        setUser(data);

        // 🔄 Sync Firebase Client Auth
        if (!auth.currentUser) {
          try {
            const tokenRes = await fetch("/api/firebase-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ uid: data.uid }),
              signal: controller.signal,
            });

            if (tokenRes.ok) {
              const { token } = await tokenRes.json();
              await signInWithCustomToken(auth, token);
            } else {
              console.warn("Failed to get Firebase client token");
            }
          } catch (firebaseSyncErr) {
            console.error("Firebase auth client sync failed", firebaseSyncErr);
          }
        }

        if (!data.completedProfile) {
          setShowCompleteProfileModal(true);
        }

        // 🔁 Fetch suggestions
        try {
          const suggestionsRes = await fetch("/api/suggestions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid: data.uid }),
            signal: controller.signal,
          });

          if (suggestionsRes.ok) {
            const suggestions = await suggestionsRes.json();
            setSuggestions(suggestions);
          } else {
            console.warn(
              "Suggestions fetch failed",
              await suggestionsRes.text()
            );
          }
        } catch (e) {
          if (e instanceof Error && e.name !== "AbortError") {
            console.error("Suggestions fetch crashed:", e);
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Session invalid or profile fetch failed:", err);
          await logoutClient(router);
          clearUser();
        }
      } finally {
        setGlobalLoading(false);
      }
    };

    checkSession();
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {!isAuthPage && globalLoading && <Loader />}

      {!isAuthPage && !globalLoading && showCompleteProfileModal && (
        <CompleteProfileModal
          onClose={() => setShowCompleteProfileModal(false)}
        />
      )}

      {(isAuthPage || !globalLoading) && children}

      <Toaster />
    </ThemeProvider>
  );
};

export default ClientLayout;
