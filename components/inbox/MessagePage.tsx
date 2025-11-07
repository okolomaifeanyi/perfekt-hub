"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
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
} from "firebase/firestore";
import { useUserStore } from "@/lib/store/useUserStore";
import { useUser } from "@/hooks/useUser";
import NavBar from "@/app/(dashboard)/[username]/components/NavBar";

import MyAvatar from "../feed/post/MyAvatar";
import Messages from "./Messages";
import { DraftMessage, MessageProps } from "@/lib/types";
import Composer from "./Composer";
import ForwardModal from "./ForwardModal";

export default function MessagePage({
  conversationId,
}: {
  conversationId: string;
}) {
  const { user } = useUserStore();
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [newMsg, setNewMsg] = useState<DraftMessage>({
    text: "",
  });
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [forwardMsg, setForwardMsg] = useState<MessageProps | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);

  // 🔎 figure out the other participant
  const [uidA, uidB] = conversationId.split("_");
  const targetUid = uidA === user?.uid ? uidB : uidA;
  const targetUser = useUser(targetUid);

  // ✅ ensure conversation exists
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "conversations", conversationId);

    (async () => {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          participants: [user.uid, targetUid],
          createdBy: user.uid,
          type: "direct",
          createdAt: serverTimestamp(),
          lastMessage: "",
          lastMessageAt: serverTimestamp(),
          unreadCount: {
            [user.uid]: 0,
            [targetUid]: 0,
          },
        });
      }
    })();
  }, [conversationId, user, targetUid]);

  // 🔥 listen to messages
  useEffect(() => {
    if (!conversationId) return;

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
  }, [conversationId]);

  // 👀 mark as read
  useEffect(() => {
    if (!conversationId || !user) return;

    const ref = doc(db, "conversations", conversationId);

    const markAsRead = async () => {
      try {
        await updateDoc(ref, {
          [`unreadCount.${user.uid}`]: 0,
        });
      } catch (err) {
        console.error("markAsRead error:", err);
      }
    };

    let timer: NodeJS.Timeout;
    const debouncedMarkAsRead = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        markAsRead();
      }, 500);
    };

    debouncedMarkAsRead();
    const onFocus = () => debouncedMarkAsRead();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        debouncedMarkAsRead();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearTimeout(timer);
    };
  }, [conversationId, user]);

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
            <>
              {targetUser?.online ? (
                <span className="text-green-500">Online</span>
              ) : targetUser?.lastSeen ? (
                <span className="text-muted">{`Last seen ${targetUser.lastSeen instanceof Date ? targetUser.lastSeen.toLocaleString() : targetUser.lastSeen && 'toDate' in targetUser.lastSeen ? targetUser.lastSeen.toDate().toLocaleString() : 'Unknown'}`}</span>
              ) : (
                <span className="text-muted">Offline</span>
              )}
            </>
          }
        />

        <Messages
          ref={bottomRef}
          messages={messages}
          conversationId={conversationId}
          onReply={msg =>
            setNewMsg(prev => ({
              ...prev,
              replyTo: {
                id: msg.id,
                text: msg.text || "",
                senderId: msg.senderId,
              },
            }))
          }
          onForward={msg => {
            setForwardMsg(msg);
            setShowForwardModal(true);
          }}
          onPin={async msg => {
            await updateDoc(doc(db, "conversations", conversationId), {
              pinned: msg.id,
            });
          }}
        />

        {/* COMPOSER */}
        <Composer
          newMsg={newMsg}
          setNewMsg={setNewMsg}
          user={user}
          conversationId={conversationId}
          targetUid={targetUid}
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
