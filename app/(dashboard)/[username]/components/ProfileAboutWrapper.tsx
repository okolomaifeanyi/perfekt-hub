import { useUserStore } from "@/lib/store/useUserStore"; // your Zustand store
import { AboutBlock } from "./AboutBlock";
import { UserProps, ViewerRole } from "@/lib/types";
import { useEffect, useState } from "react";
import { isFriend } from "@/lib/utils";

export function ProfileAboutWrapper({ profile }: { profile: UserProps }) {
  const currentUser = useUserStore((s) => s.user);

  const [viewerRole, setViewerRole] = useState<ViewerRole>("public");

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.uid === profile.uid) {
      setViewerRole("self");
    } else {
      isFriend(currentUser.uid, profile.uid).then((friend) => {
        setViewerRole(friend ? "friend" : "public");
      });
    }
  }, [currentUser, profile.uid]);

  return <AboutBlock profile={profile} viewerRole={viewerRole} />;
}
