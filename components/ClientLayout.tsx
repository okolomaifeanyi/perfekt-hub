"use client";

import { ReactNode, useEffect, useState } from "react";
import CompleteProfileModal from "./CompleteProfileModal";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { useUserStore } from "@/lib/store/useUserStore";
import { logoutClient } from "@/app/(auth)/lib/utils";
import { usePathname } from "next/navigation";
import Loader from "./Loader";
import { useRouter } from "next/navigation";
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
    let isMounted = true;

    const checkSession = async () => {
      if (isAuthPage) {
        setGlobalLoading(false);
        return;
      }

      setGlobalLoading(true);

      try {
        const res = await fetch("/api/user-profile");
        if (!res.ok) throw new Error("Not logged in");

        const data = await res.json();
        if (!isMounted) return;

        setUser(data);

        if (!data.completedProfile) {
          setShowCompleteProfileModal(true);
        }

        // ✅ Fetch suggestions after setting user
        try {
          // console.log("Fetching suggestions for UID:", data.uid);
          
          const suggestionsRes = await fetch("/api/suggestions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid: data.uid }),
          });
          

          if (!suggestionsRes.ok) {
            console.warn(
              "Suggestions fetch failed",
              await suggestionsRes.text()
            );
          } else {
            const suggestions = await suggestionsRes.json();
            console.log("Suggestions fetched:", suggestions);
            setSuggestions(suggestions);
          }
        } catch (e) {
          console.error("Suggestions fetch crashed:", e);
        }
      } catch (err) {
        console.error("Session invalid or profile fetch failed:", err);
        await logoutClient(router);
        clearUser();
      } finally {
        if (isMounted) setGlobalLoading(false);
      }
    };


    checkSession();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAuthPage,
    pathname,
    setUser,
    clearUser,
    setGlobalLoading,
    // router,
  ]);

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

      {isAuthPage || !globalLoading ? children : null}

      <Toaster />
    </ThemeProvider>
  );
};

export default ClientLayout;
