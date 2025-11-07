"use client";

import { useUserStore } from "@/lib/store/useUserStore";
import MyAvatar from "@/components/feed/post/MyAvatar";
import { Card } from "@/components/ui/card";
import { H2 } from "@/components/Typography";
import { useEffect } from "react";
import Name from "@/components/feed/post/Name";
import ConnectDropdown from "@/components/Connect";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WhoToFollow() {
  const {
    visibleSuggestions,
    rotateVisibleSuggestions,
    fetchSmartSuggestions,
  } = useUserStore();
  const { user: currentUser } = useUserStore(state => state);

  useEffect(() => {
    if (currentUser?.uid && visibleSuggestions.length === 0) {
      fetchSmartSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  if (!currentUser || visibleSuggestions.length === 0) return null;

  return (
    <Card className="p-2 space-y-1">
      <div className="flex justify-between items-center px-4">
        <H2 className="text-xl font-bold">Connect</H2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            rotateVisibleSuggestions();
            if (visibleSuggestions.length < 3) fetchSmartSuggestions();
          }}
        >
          <RotateCw className="w-4 h-4" />
        </Button>
      </div>

      <ul className="space-y-3">
        {visibleSuggestions.map(u => (
          <li key={u.uid} className="flex items-center justify-between gap-x-2">
            <div className="flex items-center gap-2">
              <MyAvatar
                username={u.username}
                fullName={u.fullName}
                photoURL={u.photoURL}
              />

              <Name username={u.username} fullName={u.fullName} />
            </div>

            <ConnectDropdown targetUid={u.uid} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
