"use client"

import { userAltImageUrl } from "@/components/UserAltImageUrl";
import { db } from "@/lib/supabase";
import { onSnapshot, doc } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

export function FriendTile({ uid }: { uid: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userDoc, setUserDoc] = useState<any | null>(null);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "users", uid), snap =>
      setUserDoc({ id: snap.id, ...snap.data() })
    );
    return () => unsub();
  }, [uid]);

  const name = userDoc?.fullName || userDoc?.username || "User";
  const avatar = userDoc?.photoURL || userAltImageUrl({ name });

  return (
    <Link
      href={`/${userDoc?.username ?? uid}`}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted"
    >
      <div className="relative w-10 h-10 rounded-full overflow-hidden">
        <Image
          src={avatar}
          alt={name}
          fill
          sizes="40px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="text-xs text-muted-foreground truncate">
          @{userDoc?.username ?? uid}
        </div>
      </div>
    </Link>
  );
}
