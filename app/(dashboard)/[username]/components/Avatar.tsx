"use client";

import JustAvatar from "@/components/JustAvatar";
import EditImageButton from "./EditImageButton";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserStore } from "@/lib/store/useUserStore";
import { useUserProfile } from "@/hooks/useUserProfile";

const Avatar = ({ uid }: { uid: string }) => {
  const profile = useUserProfile(uid);
  const currentUser = useUserStore(s => s.user);

  if (!profile) return null;
  const isMe = currentUser?.uid === profile.uid;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-fit rounded-full ring-2 ring-background">
        <JustAvatar size={70} user={profile} />

        {isMe && (
          <EditImageButton
            onChange={async url => {
              await updateDoc(doc(db, "users", profile.uid), { photoURL: url });
            }}
            uid={profile.uid}
            type="avatar"
          />
        )}
      </div>
    </div>
  );
};


export default Avatar;
