"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import ForwardModal from "./ForwardModal";
import {
  getOtherConversationParticipant,
  parseDirectConversationId,
} from "@/lib/conversation-utils.mjs";

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
          avatar={
            <MyAvatar
              username={targetUser?.username || "User"}
              photoURL={targetUser?.photoURL}
              fullName={targetUser?.fullName}
            />
          }
          title={targetUser?.fullName || targetUser?.username || "Someone"}
          extra={
            targetUser?.online ? (
              <span className="text-green-500">Online</span>
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
            )
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
