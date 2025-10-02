import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { toast } from "sonner";
import { UserProps } from "@/lib/types";

export function useEditProfile(uid: string) {
  const [isSaving, setIsSaving] = useState(false);

  const saveProfile = async (values: Partial<UserProps>) => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "users", uid), values, { merge: true });
      toast.success("Profile updated successfully");
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { saveProfile, isSaving };
}
