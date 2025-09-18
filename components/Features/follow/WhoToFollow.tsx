"use client";

import { useUserStore } from "@/lib/store/useUserStore";
import MyAvatar from "@/components/feed/post/MyAvatar";
import { Card } from "@/components/ui/card";
import { H2 } from "@/components/Typography";
import { useEffect } from "react";
import Name from "@/components/feed/post/Name";
import ConnectDropdown from "@/components/Connect";
// import { FollowButton } from "@/components/FollowButton";
// import { isFollowing } from "@/components/utils";
// import { ConnectDropdown } from "@/components/Connect";

export default function WhoToFollow() {
  const { visibleSuggestions, rotateVisibleSuggestions } = useUserStore();
  const { user: currentUser } = useUserStore(state => state);
  // const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    rotateVisibleSuggestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentUser) return null;

  return (
    <Card className="p-2 w-full">
      <H2 className="text-xl">New Connections</H2>
      <ul className="space-y-3">
        {visibleSuggestions.map(u => (
          <li key={u.uid} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MyAvatar
                username={u.username}
                fullName={u.fullName}
                photoURL={u.photoURL}
              />
              <Name username={u.username} fullName={u.fullName} />
            </div>
            <div>
              <ConnectDropdown targetUid={u.uid} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
