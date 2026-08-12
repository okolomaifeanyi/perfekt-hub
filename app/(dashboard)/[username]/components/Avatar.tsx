"use client";

import JustAvatar from "@/components/JustAvatar";
import EditImageButton from "./EditImageButton";
import { doc, updateDoc } from "@/lib/supabase";
import { db } from "@/lib/supabase";
import { useUserStore } from "@/lib/store/useUserStore";
import { useUserProfile } from "@/hooks/useUserProfile";
import { P } from "@/components/Typography";

const Avatar = ({ uid }: { uid: string }) => {
  const profile = useUserProfile(uid);
  const currentUser = useUserStore(s => s.user);

  const isMe = currentUser?.uid === profile?.uid;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-fit rounded-full ring-2 ring-background">
        <JustAvatar user={profile} />

        {isMe && profile && (
          <EditImageButton
            onChange={async url => {
              await updateDoc(doc(db, "users", profile?.uid), {
                photoURL: url,
              });
            }}
            uid={profile.uid}
            type="avatar"
          />
        )}
      </div>

      <div>
        {profile?.fullName && (
          <h1 className="text-xl font-black">{profile.fullName}</h1>
        )}

        {profile && (
          <P className="text-md text-gray-400 !mt-0">@{profile?.username}</P>
        )}
      </div>
    </div>
  );
};

export default Avatar;
