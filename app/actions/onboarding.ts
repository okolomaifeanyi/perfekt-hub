import { auth, db } from "@/lib/firebase";
import {
  OnboardingStep1Schema,
  OnboardingStep2Schema,
} from "@/lib/schemas/onboarding";
import { FormState } from "@/lib/schemas/types";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { v2 as cloudinary } from "cloudinary";
import { UserProfile } from "@/lib/schemas/userProfile";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function handleOnboardingStep1(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const user = auth.currentUser;
  if (!user) {
    return { message: "Authentication required to complete onboarding." };
  }

  const profilePictureFile = formData.get("profilePicture") as File | null;

  const data = {
    fullName: formData.get("fullName"),
    bio: formData.get("bio"),
    profilePicture:
      profilePictureFile && profilePictureFile.size > 0
        ? profilePictureFile
        : undefined,
  };

  const parsed = OnboardingStep1Schema.safeParse(data);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    console.error("Onboarding Step 1 Validation Errors:", errors);
    return {
      errors: {
        fullName: errors.fullName,
        bio: errors.bio,
        profilePicture: errors.profilePicture,
      },
      message: "Please correct the errors in your profile details.",
    };
  }

  let profilePictureUrl: string | null = null;
  let profilePicturePublicId: string | null = null;

  const userRef = doc(db, "users", user.uid);

  const userDoc = await getDoc(userRef);

  const currentProfileData = userDoc.exists()
    ? (userDoc.data() as UserProfile)
    : {
        profilePictureUrl: null,
        profilePicturePublicId: null,
      };

  try {
    if (
      parsed.data.profilePicture instanceof File &&
      parsed.data.profilePicture.size > 0
    ) {
      const file = parsed.data.profilePicture;

      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      const ALLOWED_MIME_TYPES = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];

      if (file.size > MAX_FILE_SIZE) {
        return {
          errors: { profilePicture: ["File size too large (max 5MB)."] },
          message: "Image upload failed.",
        };
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return {
          errors: {
            profilePicture: [
              "Invalid file type. Only JPG, PNG, GIF, WEBP allowed.",
            ],
          },
          message: "Image upload failed.",
        };
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64File = `data:${file.type};base64,${buffer.toString(
        "base64"
      )}`;

      const uploadResult = await cloudinary.uploader.upload(base64File, {
        folder: `profile_pictures/${user.uid}`,
        resource_type: "image",
        quality: "auto",
        fetch_format: "auto",
      });

      if (
        typeof currentProfileData.profilePicturePublicId === "string" &&
        currentProfileData.profilePicturePublicId.trim() !== ""
      ) {
        try {
          await cloudinary.uploader.destroy(
            currentProfileData.profilePicturePublicId
          );
          console.log(
            `[Cloudinary] Deleted old profile picture: ${currentProfileData.profilePicturePublicId}`
          );
        } catch (deleteError) {
          console.warn(
            `[Cloudinary] Failed to delete old profile picture ${currentProfileData.profilePicturePublicId}:`,
            deleteError
          );
        }
      }

      profilePictureUrl = uploadResult.secure_url;
      profilePicturePublicId = uploadResult.public_id;
      console.log(
        `[Cloudinary] Profile picture uploaded for ${user.uid}: ${profilePictureUrl}`
      );
    } else if (profilePictureFile === null) {
      if (currentProfileData.profilePicturePublicId) {
        try {
          await cloudinary.uploader.destroy(
            currentProfileData.profilePicturePublicId
          );
          console.log(
            `[Cloudinary] Deleted old profile picture on clear: ${currentProfileData.profilePicturePublicId}`
          );
        } catch (deleteError) {
          console.warn(
            `[Cloudinary] Failed to delete old profile picture on clear ${currentProfileData.profilePicturePublicId}:`,
            deleteError
          );
        }
      }
      profilePictureUrl = null;
      profilePicturePublicId = null;
    } else {
      // No new file provided, retain existing URL and public ID
      profilePictureUrl = currentProfileData.profilePictureUrl || null;
      profilePicturePublicId =
        currentProfileData.profilePicturePublicId || null;
    }

    await updateDoc(userRef, {
      fullName: parsed.data.fullName,
      bio: parsed.data.bio === "" ? null : parsed.data.bio,
      profilePictureUrl,
      profilePicturePublicId,
      onboardingStep1Completed: true,
      updatedAt: new Date().toISOString(),
    });

    console.log(`[DB Action] Onboarding Step 1 data saved for ${user.uid}`);
    return { message: "Profile details saved successfully!" };
  } catch (error: unknown) {
    console.error(
      "[DB Action] Error saving onboarding step 1 or uploading to Cloudinary:",
      error
    );
    return {
      message:
        error instanceof Error
          ? error.message
          : "Failed to save profile details or upload image.",
    };
  }
}

export async function handleOnboardingStep2(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  "use client";

  const user = auth.currentUser;
  if (!user) {
    return { message: "Authentication required to complete onboarding." };
  }

  const interests = formData.getAll("interests") as string[];
  const receiveNewsletter = formData.get("receiveNewsletter") === "on";

  const data = {
    interests: interests,
    receiveNewsletter: receiveNewsletter,
  };

  const parsed = OnboardingStep2Schema.safeParse(data);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    console.error("Onboarding Step 2 Validation Errors:", errors);
    return {
      errors: {
        interests: errors.interests,
      },
      message: "Please correct the errors in your preferences.",
    };
  }

  try {
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      interests: parsed.data.interests,
      receiveNewsletter: parsed.data.receiveNewsletter,
      onboardingCompleted: true,
      updatedAt: new Date().toISOString(),
    });
    console.log(`[DB Action] Onboarding Step 2 data saved for ${user.uid}`);
    return { message: "Preferences saved successfully! Onboarding complete." };
  } catch (error: unknown) {
    console.error("[DB Action] Error saving onboarding step 2:", error);
    return {
      message:
        error instanceof Error ? error.message : "Failed to save preferences.",
    };
  }
}
