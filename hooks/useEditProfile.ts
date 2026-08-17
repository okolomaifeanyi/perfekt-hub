// hooks/useEditProfile.ts
import { db } from "@/lib/supabase";
import { doc, setDoc } from "@/lib/supabase";
import { useState } from "react";
import { toast } from "sonner";
import { UserProps } from "@/lib/types";
import { useUserStore } from "@/lib/store/useUserStore";

export function useEditProfile(uid: string) {
  const [isSaving, setIsSaving] = useState(false);

  const saveProfile = async (values: Partial<UserProps>) => {
    setIsSaving(true);
    try {
      // ──────────────────────────────────────────────────────────────
      // 1. Always ensure fullName_lowercase is present and correct
      // ──────────────────────────────────────────────────────────────
      const payload: Partial<UserProps> = { ...values };

      if (values.fullName !== undefined) {
        payload.fullName_lowercase = values.fullName.trim().toLowerCase();
      }

      // Optional: Clean up empty strings (but keep required fields)
      Object.keys(payload).forEach(key => {
        const k = key as keyof typeof payload;
        if (
          (payload[k] === "" ||
            payload[k] === undefined ||
            payload[k] === null) &&
          k !== "fullName_lowercase" // preserve even if empty
        ) {
          delete payload[k];
        }
      });

      // ──────────────────────────────────────────────────────────────
      // 2. Save to Firestore
      // ──────────────────────────────────────────────────────────────
      await setDoc(doc(db, "users", uid), payload, { merge: true });

      // The store's user listener polls every ~3s (see startUserListener),
      // so anything reading `user` from the store — like the profile
      // completion percentage — would keep showing stale data for up to
      // that long after a save. Merge the just-saved fields in immediately
      // instead of waiting on the next poll.
      const { user: currentUser, setUser } = useUserStore.getState();
      if (currentUser?.uid === uid) {
        setUser({ ...currentUser, ...payload });
      }

      toast.success("Profile updated successfully");
      return true;
    } catch (err) {
      console.error("Failed to save profile:", err);
      toast.error("Failed to update profile");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { saveProfile, isSaving };
}
