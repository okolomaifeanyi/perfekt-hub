"use server";

import { firestoreAdmin, authAdmin } from "@/lib/supabase";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import { v2 as cloudinary } from "cloudinary";

const BATCH_LIMIT = 300;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// Batch delete helper
async function deleteCollection(path: string): Promise<void> {
  const ref = firestoreAdmin.collection(path);

  while (true) {
    const snap = await ref.limit(BATCH_LIMIT).get();
    if (snap.empty) break;

    const batch = firestoreAdmin.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
  }
}

// Delete Cloudinary media belonging to user posts
async function deleteUserCloudinaryMedia(uid: string): Promise<void> {
  const postsRef = firestoreAdmin.collection("posts");

  while (true) {
    const snap = await postsRef
      .where("authorId", "==", uid)
      .limit(BATCH_LIMIT)
      .get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const post = doc.data();

      // Case 1: single image or video field
      if (post.image?.publicId) {
        await cloudinary.uploader.destroy(post.image.publicId);
      }
      if (post.video?.publicId) {
        await cloudinary.uploader.destroy(post.video.publicId, {
          resource_type: "video",
        });
      }

      // Case 2: multiple media array
      if (Array.isArray(post.media)) {
        for (const file of post.media) {
          await cloudinary.uploader.destroy(file.publicId, {
            resource_type: file.type === "video" ? "video" : "image",
          });
        }
      }
    }
  }
}

// Delete top-level posts
async function deleteUserPosts(uid: string): Promise<void> {
  const postsRef = firestoreAdmin.collection("posts");

  while (true) {
    const snap = await postsRef
      .where("authorId", "==", uid)
      .limit(BATCH_LIMIT)
      .get();
    if (snap.empty) break;

    const batch = firestoreAdmin.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

// Delete conversations + messages
async function deleteUserConversations(uid: string): Promise<void> {
  const convRef = firestoreAdmin.collection("conversations");

  while (true) {
    const snap = await convRef
      .where("participants", "array-contains", uid)
      .limit(BATCH_LIMIT)
      .get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      await deleteCollection(`conversations/${doc.id}/messages`);
    }

    const batch = firestoreAdmin.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

export async function deleteAccountAction(
  uid: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!uid) return { success: false, message: "Missing userId" };

    const session = await getUserFromSession();
    if (!session.uid || session.uid !== uid) {
      return { success: false, message: "Unauthorized" };
    }

    const userRef = firestoreAdmin.collection("users").doc(uid);

    // USER SUBCOLLECTIONS
    const subs = [
      "followers",
      "following",
      "notifications",
      "savedPosts",
      "reactions",
      "friends",
    ];
    await Promise.all(subs.map(s => deleteCollection(`users/${uid}/${s}`)));

    // DELETE CLOUDINARY MEDIA FIRST
    await deleteUserCloudinaryMedia(uid);

    // DELETE POSTS
    await deleteUserPosts(uid);

    // DELETE CONVERSATIONS
    await deleteUserConversations(uid);

    // DELETE USER
    await userRef.delete();

    // DELETE AUTH USER
    await authAdmin.deleteUser(uid);

    return {
      success: true,
      message: "Account deleted with all media removed.",
    };
  } catch (error) {
    console.error("❌ Delete account error:", error);
    return { success: false, message: "Failed to delete account" };
  }
}
