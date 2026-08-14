"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { db } from "@/lib/supabase";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  getDoc,
} from "@/lib/supabase";
import { useUserStore } from "@/lib/store/useUserStore";
import { canUsePrivateData } from "@/lib/private-data-access.mjs";
import { useUser } from "@/hooks/useUser";
import NavBar from "@/app/(dashboard)/[username]/components/NavBar";
import MyAvatar from "../feed/post/MyAvatar";
import Messages from "./Messages";
import { DraftMessage, MessageProps } from "@/lib/types";
import Composer from "./Composer";
import SmartReplyChips from "./SmartReplyChips";
import ForwardModal from "./ForwardModal";
import {
  getOtherConversationParticipant,
  parseDirectConversationId,
} from "@/lib/conversation-utils.mjs";
import { getPresenceStatus } from "@/lib/presence.mjs";
import { cn } from "@/lib/utils";

// @stream-io/video-react-sdk (imported transitively via useStartCall) is a
// WebRTC client library — this page is server-rendered on first load like
// any other route, so a static import here would pull that module into the
// server render pass too. ssr:false keeps it out of that path entirely.
const DirectCallButton = dynamic(() => import("@/components/calls/DirectCallButton"), {
  ssr: false,
});

export default function MessagePage({
  conversationId,
}: {
  conversationId: string;
}) {
  const { user } = useUserStore();
  const authReady = useUserStore(state => state.authReady);
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [newMsg, setNewMsg] = useState<DraftMessage>({ text: "" });
  const bottomRef = useRef<HTMLDivElement>(null);
  const [forwardMsg, setForwardMsg] = useState<MessageProps | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [conversationParticipants, setConversationParticipants] = useState<
    string[]
  >([]);

  const parsedParticipants = useMemo(
    () => parseDirectConversationId(conversationId),
    [conversationId]
  );
  const effectiveParticipants =
    conversationParticipants.length > 0
      ? conversationParticipants
      : parsedParticipants ?? [];
  const targetUid = getOtherConversationParticipant(
    effectiveParticipants,
    user?.uid ?? ""
  );
  const targetUser = useUser(targetUid);
  // targetUser's doc only re-fires onSnapshot when THEIR heartbeat writes
  // to it, so without this, their status would freeze at its last-known
  // value instead of aging down to "recently active"/"offline" once they
  // stop (see the same pattern in useOnlineFriends).
  const [presenceTick, setPresenceTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setPresenceTick(t => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);
  const targetUserPresence = useMemo(
    () => (targetUser ? getPresenceStatus(targetUser) : "offline"),
    // presenceTick is intentionally unused in the body — see above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targetUser, presenceTick]
  );

  /* ---- ensure conversation doc ---- */
  useEffect(() => {
    const currentUid = user?.uid ?? "";
    if (!canUsePrivateData(authReady, currentUid)) return;
    const ref = doc(db, "conversations", conversationId);
    (async () => {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        if (!parsedParticipants) {
          return;
        }

        const otherUid = getOtherConversationParticipant(
          parsedParticipants,
          currentUid
        );
        if (!otherUid) {
          return;
        }

        await setDoc(ref, {
          participants: parsedParticipants,
          createdAt: serverTimestamp(),
          lastMessage: "",
          lastMessageAt: serverTimestamp(),
          unreadCount: { [currentUid]: 0, [otherUid]: 0 },
        });
        setConversationParticipants(parsedParticipants);
        return;
      }

      const storedParticipants = snap.data()?.participants;
      if (Array.isArray(storedParticipants) && storedParticipants.length > 0) {
        setConversationParticipants(storedParticipants);
      } else if (parsedParticipants) {
        setConversationParticipants(parsedParticipants);
      }
    })();
  }, [authReady, conversationId, parsedParticipants, user?.uid]);

  /* ---- listen to messages ---- */
  useEffect(() => {
    if (!canUsePrivateData(authReady, user?.uid) || !conversationId) return;
    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(
        d => ({ id: d.id, ...d.data() } as MessageProps)
      );
      setMessages(list);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    return () => unsub();
  }, [authReady, conversationId, user?.uid]);

  /* ---- mark as read ---- */
  useEffect(() => {
    if (!canUsePrivateData(authReady, user?.uid) || !conversationId || !user) return;
    const ref = doc(db, "conversations", conversationId);
    const mark = async () => {
      await updateDoc(ref, { [`unreadCount.${user.uid}`]: 0 });
    };
    const debounced = () => {
      const t = setTimeout(mark, 500);
      return () => clearTimeout(t);
    };
    const handler = debounced();
    const focus = () => debounced();
    const vis = () => document.visibilityState === "visible" && debounced();
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", vis);
      handler();
    };
  }, [authReady, conversationId, user]);

  if (!authReady) {
    return <div className="p-4">Loading conversation...</div>;
  }

  if (!user) {
    return <div className="p-4">Please login</div>;
  }

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-3rem)] max-w-full overflow-hidden">
        <NavBar
          backHref="/messages"
          hideBackOnDesktop
          avatar={
            <div className="relative">
              <MyAvatar
                username={targetUser?.username || "User"}
                photoURL={targetUser?.photoURL}
                fullName={targetUser?.fullName}
              />
              {targetUser && targetUserPresence !== "offline" && (
                <span
                  className={cn(
                    "absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-background",
                    targetUserPresence === "online" ? "bg-green-500" : "bg-yellow-500"
                  )}
                />
              )}
            </div>
          }
          title={targetUser?.fullName || targetUser?.username || "Someone"}
          extra={
            <div className="flex items-center gap-3">
              {targetUserPresence === "online" ? (
                <span className="text-green-500">Online</span>
              ) : targetUserPresence === "recently-active" ? (
                <span className="text-yellow-500">Active recently</span>
              ) : targetUser?.lastSeen ? (
                <span className="text-muted">
                  Last seen{" "}
                  {(targetUser.lastSeen instanceof Date
                    ? targetUser.lastSeen
                    : "toDate" in targetUser.lastSeen
                    ? targetUser.lastSeen.toDate()
                    : null
                  )?.toLocaleString() ?? "Unknown"}
                </span>
              ) : (
                <span className="text-muted">Offline</span>
              )}

              {targetUid && <DirectCallButton targetUid={targetUid} />}
            </div>
          }
        />

        <Messages
          ref={bottomRef}
          messages={messages}
          conversationId={conversationId}
          onReply={msg =>
            setNewMsg(p => ({
              ...p,
              replyTo: {
                id: msg.id,
                text: msg.text ?? "",
                senderId: msg.senderId,
                senderName:
                  msg.senderId === user?.uid
                    ? user?.fullName || user?.username
                    : targetUser?.fullName || targetUser?.username,
              },
            }))
          }
          onForward={msg => {
            setForwardMsg(msg);
            setShowForwardModal(true);
          }}
          // onPin={async msg => {
          //   await updateDoc(doc(db, "conversations", conversationId), {
          //     pinned: msg.id,
          //   });
          // }}
        />

        <SmartReplyChips
          messages={messages}
          onSelect={text => setNewMsg(p => ({ ...p, text }))}
        />

        <Composer
          newMsg={newMsg}
          setNewMsg={setNewMsg}
          user={user}
          conversationId={conversationId}
          targetUid={targetUid ?? parsedParticipants?.find(id => id !== user?.uid) ?? ""}
        />
      </div>

      {showForwardModal && forwardMsg && (
        <ForwardModal
          message={forwardMsg}
          onClose={() => setShowForwardModal(false)}
        />
      )}
    </>
  );
}
