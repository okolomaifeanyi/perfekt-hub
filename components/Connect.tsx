"use client";

import { useEffect, useState } from "react";
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
  // UserCheck,
  // Loader2,
} from "lucide-react";

export default function ConnectDropdown({ targetUid }: { targetUid: string }) {
  const [status, setStatus] = useState<
    "none" | "following" | "friends" | "requested" | "pending"
  >("none");
  const [loading, setLoading] = useState(false);

  const label = {
    none: "Connect",
    following: "Following",
    friends: "Connected",
    requested: "Requested",
    pending: "Pending",
  }[status];

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/friends/${targetUid}/status`, {
          headers: {
            Authorization: `Bearer ${await getFirebaseToken()}`,
          },
        });
        const data = await res.json();
        if (res.ok) setStatus(data.status);
      } catch (error) {
        console.error("Error fetching friend status:", error);
      }
    };

    fetchStatus();
  }, [targetUid]);

  const handleAction = async (
    action: "follow" | "unfollow" | "befriend" | "unfriend" | "disconnect"
  ) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/friends/${targetUid}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await getFirebaseToken()}`,
        },
      });

      if (!res.ok) throw new Error("Action failed");

      // Update local status
      if (action === "befriend") {
        setStatus(prev => (prev === "pending" ? "friends" : "requested"));
      } else if (action === "follow") {
        setStatus("following");
      } else if (action === "unfollow") {
        setStatus("none");
      } else if (action === "unfriend" || action === "disconnect") {
        setStatus("none");
      }
    } catch (error) {
      console.error("Action error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" disabled={loading}>
          {loading ? (
            <>
              Processing...
            </>
          ) : (
            <>
              {/* <UserCheck className="h-4 w-4" /> */}
              {label}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* === NONE === */}
        {status === "none" && (
          <>
            <DropdownMenuItem onClick={() => handleAction("befriend")}>
              <Handshake className="mr-2 h-4 w-4" /> Befriend
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction("follow")}>
              <UserPlus className="mr-2 h-4 w-4" /> Follow
            </DropdownMenuItem>
          </>
        )}

        {/* === REQUESTED (you sent request) === */}
        {status === "requested" && (
          <>
            <DropdownMenuItem disabled>
              <UserPlus className="mr-2 h-4 w-4" /> Request Sent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction("unfriend")}>
              <UserMinus className="mr-2 h-4 w-4" /> Cancel Request
            </DropdownMenuItem>
          </>
        )}

        {/* === PENDING (you received request) === */}
        {status === "pending" && (
          <>
            <DropdownMenuItem onClick={() => handleAction("befriend")}>
              <Handshake className="mr-2 h-4 w-4" /> Accept Request
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction("unfriend")}>
              <UserMinus className="mr-2 h-4 w-4" /> Decline Request
            </DropdownMenuItem>
          </>
        )}

        {/* === FOLLOWING === */}
        {status === "following" && (
          <>
            <DropdownMenuItem onClick={() => handleAction("unfollow")}>
              <UserMinus className="mr-2 h-4 w-4" /> Unfollow
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction("befriend")}>
              <Handshake className="mr-2 h-4 w-4" /> Befriend
            </DropdownMenuItem>
          </>
        )}

        {/* === FRIENDS === */}
        {status === "friends" && (
          <DropdownMenuItem onClick={() => handleAction("disconnect")}>
            <UserMinus className="mr-2 h-4 w-4" /> Disconnect
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Firebase token fetcher (if not already implemented)
async function getFirebaseToken(): Promise<string> {
  const user = await import("firebase/auth").then(
    ({ getAuth }) => getAuth().currentUser
  );
  if (!user) throw new Error("Not authenticated");
  return await user.getIdToken();
}
