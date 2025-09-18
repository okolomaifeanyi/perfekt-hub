"use client";

import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { toast } from "sonner";

export function useEditProfile(
  uid: string,
  initial: {
    fullName?: string;
    bio?: string;
    website?: string;
    location?: string;
  }
) {
  const [form, setForm] = useState({
    fullName: initial.fullName ?? "",
    bio: initial.bio ?? "",
    website: initial.website ?? "",
    location: initial.location ?? "",
  });

  const saveProfile = async () => {
    try {
      await updateDoc(doc(db, "users", uid), {
        fullName: form.fullName.trim(),
        bio: form.bio.trim(),
        website: form.website.trim(),
        location: form.location.trim(),
      });
      toast.success("Profile updated");
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile");
      return false;
    }
  };

  return { form, setForm, saveProfile };
}
