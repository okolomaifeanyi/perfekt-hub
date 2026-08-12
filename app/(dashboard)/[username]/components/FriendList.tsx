"use client"

import { db } from "@/lib/supabase";
import { query, collection, limit, onSnapshot, orderBy } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { FriendTile } from "./FriendTile";

export default function FriendsList({ uid, isMe }: { uid: string; isMe: boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Your rules may restrict reading others' friends; catch permission errors gracefully
    const q = query(
      collection(db, `users/${uid}/friends`),
      orderBy("createdAt", "desc"),
      limit(24)
    );
    const unsub = onSnapshot(
      q,
      async snap => {
        const rows = snap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({
          id: d.id,
          ...d.data(),
        }));
        setItems(rows);
      },
      err => {
        console.warn("friends read error", err);
        setError("This user's friends are private.");
      }
    );
    return () => unsub();
  }, [uid]);

  if (error && !isMe)
    return <p className="text-sm text-muted-foreground">{error}</p>;
  if (!items.length)
    return <p className="text-sm text-muted-foreground">No friends to show.</p>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {items.map(fr => (
        <FriendTile key={fr.id} uid={fr.id} />
      ))}
    </div>
  );
}
