"use client";

import EditImageButton from "./EditImageButton";
import { updateDoc, doc } from "@/lib/supabase";
import { db } from "@/lib/supabase";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserStore } from "@/lib/store/useUserStore";
import { ContainedImage } from "@/components/media/ContainedImage";

const Cover = ({ uid }: { uid: string }) => {
  const profile = useUserProfile(uid);
  const currentUser = useUserStore(s => s.user);

  // if (!profile) return null;

  const isMe = currentUser?.uid === profile?.uid;

  return (
    <div className="aspect-[3/1] relative">
      <ContainedImage
        src={
          profile?.coverURL ||
          `https://picsum.photos/seed/${profile?.username}/1200/400`
        }
        alt={`${profile?.username}'s cover image` || "Cover image"}
        sizes="100vw"
        className="h-full w-full"
        imageClassName="object-contain"
        loading="eager"
        priority={true}
      />

      {isMe && profile && (
        <EditImageButton
          position="top-right"
          onChange={async url => {
            await updateDoc(doc(db, "users", profile?.uid), { coverURL: url });
          }}
          uid={profile.uid}
          type="coverImage"
        />
      )}
    </div>
  );
};

export default Cover;
