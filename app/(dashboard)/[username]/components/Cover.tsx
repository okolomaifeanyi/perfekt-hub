"use client";

import Image from "next/image";
import EditImageButton from "./EditImageButton";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserStore } from "@/lib/store/useUserStore";

const Cover = ({ uid }: { uid: string }) => {
  const profile = useUserProfile(uid);
  const currentUser = useUserStore(s => s.user);

  if (!profile) return null;

  const isMe = currentUser?.uid === profile.uid;

  return (
    <div className="h-32 relative">
      <Image
        src={
          profile.coverURL ||
          `https://picsum.photos/seed/${profile.username}/1200/400`
        }
        alt="Cover"
        fill
        sizes="100vw"
        className="object-cover"
      />

      {isMe && (
        <EditImageButton
          position="top-right"
          onChange={async url => {
            await updateDoc(doc(db, "users", profile.uid), { coverURL: url });
          }}
          uid={profile.uid}
          type="coverImage"
        />
      )}
    </div>
  );
};

export default Cover;
