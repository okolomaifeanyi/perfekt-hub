"use client";

import { useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Handshake,
  UserPlus,
  UserMinus,
  Loader2,
  ChevronDown,
  UserCheck,
} from "lucide-react";
import { useFriendStore } from "@/lib/store/friendStore";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useUserStore } from "@/lib/store/useUserStore"; // ✅ assuming you keep logged-in user in Zustand

export default function ConnectDropdown({ targetUid }: { targetUid: string }) {
  const status = useFriendStore(s => s.statuses[targetUid]) ?? "none";
  const isLoading = useFriendStore(s => Boolean(s.loading[targetUid]));
  const handleAction = useFriendStore(state => state.handleAction);
  const setStatus = useFriendStore(s => s.setStatus);
  const { user } = useUserStore();

  const label = {
    none: "Connect",
    following: "Following",
    friends: "Friend",
    pending: "Accept Request",
    requested: "Sent Request",
  }[status];

  // 🔥 Real-time Firestore subscription
  useEffect(() => {
    if (!user?.uid || !targetUid) return;

    const uid = user.uid;

    const unsubFriends = onSnapshot(
      doc(db, `users/${uid}/friends/${targetUid}`),
      snap => {
        if (snap.exists()) setStatus(targetUid, "friends");
      }
    );

    const unsubSent = onSnapshot(
      doc(db, `users/${uid}/friendRequestsSent/${targetUid}`),
      snap => {
        if (snap.exists()) setStatus(targetUid, "requested");
      }
    );

    const unsubRecv = onSnapshot(
      doc(db, `users/${uid}/friendRequestsReceived/${targetUid}`),
      snap => {
        if (snap.exists()) setStatus(targetUid, "pending");
      }
    );

    const unsubFollow = onSnapshot(
      doc(db, `users/${uid}/following/${targetUid}`),
      snap => {
        if (snap.exists()) setStatus(targetUid, "following");
      }
    );

    // Clean up
    return () => {
      unsubFriends();
      unsubSent();
      unsubRecv();
      unsubFollow();
    };
  }, [user?.uid, targetUid, setStatus]);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="animate-spin mr-2 h-4 w-4" />
          ) : (
            <>
              {label} <ChevronDown className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        {/* NONE */}
        {status === "none" && (
          <>
            <DropdownMenuItem
              disabled={isLoading}
              onClick={() => handleAction(targetUid, "befriend")}
            >
              <Handshake className="mr-2 h-4 w-4" /> Befriend
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isLoading}
              onClick={() => handleAction(targetUid, "follow")}
            >
              <UserPlus className="mr-2 h-4 w-4" /> Follow
            </DropdownMenuItem>
          </>
        )}

        {/* REQUESTED (you sent) */}
        {status === "requested" && (
          <>
            <DropdownMenuItem disabled>
              <UserCheck className="mr-2 h-4 w-4" /> Request Sent
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isLoading}
              onClick={() => handleAction(targetUid, "cancel")}
            >
              <UserMinus className="mr-2 h-4 w-4" /> Cancel Request
            </DropdownMenuItem>
          </>
        )}

        {/* PENDING (you received) */}
        {status === "pending" && (
          <>
            <DropdownMenuItem
              disabled={isLoading}
              onClick={() => handleAction(targetUid, "accept")}
            >
              <UserCheck className="mr-2 h-4 w-4" /> Accept Request
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isLoading}
              onClick={() => handleAction(targetUid, "disconnect")}
            >
              <UserMinus className="mr-2 h-4 w-4" /> Decline Request
            </DropdownMenuItem>
          </>
        )}

        {/* FOLLOWING */}
        {status === "following" && (
          <>
            <DropdownMenuItem
              disabled={isLoading}
              onClick={() => handleAction(targetUid, "unfollow")}
            >
              <UserMinus className="mr-2 h-4 w-4" /> Unfollow
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isLoading}
              onClick={() => handleAction(targetUid, "befriend")}
            >
              <Handshake className="mr-2 h-4 w-4" /> Befriend
            </DropdownMenuItem>
          </>
        )}

        {/* FRIENDS */}
        {status === "friends" && (
          <DropdownMenuItem
            disabled={isLoading}
            onClick={() => handleAction(targetUid, "disconnect")}
          >
            <UserMinus className="mr-2 h-4 w-4" /> Disconnect
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
