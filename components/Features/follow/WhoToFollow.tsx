"use client";

import { useUserStore } from "@/lib/store/useUserStore";
import MyAvatar from "@/components/feed/post/MyAvatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { H2 } from "@/components/Typography";
import { useEffect } from "react";
import Name from "@/components/feed/post/Name";

export default function WhoToFollow() {
  const { visibleSuggestions, rotateVisibleSuggestions } = useUserStore();

  useEffect(() => {
    rotateVisibleSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="p-4 w-full">
      <H2>Who to follow</H2>
      <ul className="space-y-3">
        {visibleSuggestions.map(u => {
          return (
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
                <Button size="sm">Follow</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
