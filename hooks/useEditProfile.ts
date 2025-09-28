"use client";

import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { toast } from "sonner";

export function useEditProfile(uid: string) {
  const [isSaving, setIsSaving] = useState(false);

  const saveProfile = async (values: {
    fullName: string;
    bio: string;
    website: string;
    location: string;
  }) => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "users", uid), {
        fullName: values.fullName.trim(),
        bio: values.bio.trim(),
        website: values.website.trim(),
        location: values.location.trim(),
      });
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
