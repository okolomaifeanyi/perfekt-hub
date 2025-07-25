/* eslint-disable @typescript-eslint/no-unused-vars */
import { db } from "@/lib/firebase";
import {
  doc,
  deleteDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  writeBatch,
  getDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import { getAuth } from "firebase/auth";
const auth = getAuth();

export async function deletePost(postId: string) {
  const user = auth.currentUser;
  if (!user) {
    toast.error("Not signed in", {position: "top-right"});
    return;
  }

  console.log("Post Id", postId);

  try {
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);
    const post = postSnap.data();

    if (post?.userId !== user.uid) {
      toast.error("You can't delete this post", { position: "top-right" });
      return;
    }

    await deleteDoc(postRef);
    toast.success("Post deleted successfully", { position: "top-right" });
  } catch (err) {
    console.error("deletePost:", err);
    toast.error("Failed to delete post", { position: "top-right" });
  }
}

export async function blockUser(currentUserId: string, targetUserId: string) {
  try {
    await setDoc(doc(db, `users/${currentUserId}/blocked`, targetUserId), {
      blockedAt: Date.now(),
    });
    toast.success("User blocked successfully");
  } catch (err) {
    console.error("blockUser:", err);
    toast.error("Failed to block user");
  }
}

export async function unfriendUser(
  currentUserId: string,
  targetUserId: string
) {
  try {
    await Promise.all([
      deleteDoc(doc(db, `users/${currentUserId}/friends`, targetUserId)),
      deleteDoc(doc(db, `users/${targetUserId}/friends`, currentUserId)),
    ]);
    toast.success("User unfriended successfully");
  } catch (err) {
    console.error("unfriendUser:", err);
    toast.error("Failed to unfriend user");
  }
}

export async function unfollowUser(
  currentUserId: string,
  targetUserId: string
) {
  try {
    await Promise.all([
      deleteDoc(doc(db, `users/${currentUserId}/following`, targetUserId)),
      deleteDoc(doc(db, `users/${targetUserId}/followers`, currentUserId)),
    ]);
    toast.success("User unfollowed successfully");
  } catch (err) {
    console.error("unfollowUser:", err);
    toast.error("Failed to unfollow user");
  }
}

export async function pinPost(postId: string, userId: string) {
  try {
    const pinnedQuery = query(
      collection(db, "posts"),
      where("userId", "==", userId),
      where("pinned", "==", true)
    );

    const pinnedSnapshot = await getDocs(pinnedQuery);
    const batch = writeBatch(db);

    pinnedSnapshot.forEach(docSnap => {
      batch.update(docSnap.ref, {
        pinned: false,
        pinnedAt: null,
      });
    });

    const postRef = doc(db, "posts", postId);
    batch.update(postRef, {
      pinned: true,
      pinnedAt: Date.now(),
    });

    await batch.commit();

    toast.success("Post pinned successfully");
  } catch (err) {
    console.error("pinPost error:", err);
    toast.error("Failed to pin post");
  }
}

export async function fetchFriends(uid: string) {
  try {
    const snapshot = await getDocs(collection(db, `users/${uid}/friends`));
    const ids = snapshot.docs.map(doc => doc.id);
    return { success: true, data: ids };
  } catch (error) {
    return { success: false, error: "Failed to fetch friends" };
  }
}

export async function fetchFollowing(uid: string) {
  try {
    const snapshot = await getDocs(collection(db, `users/${uid}/following`));
    const ids = snapshot.docs.map(doc => doc.id);
    return { success: true, data: ids };
  } catch (error) {
    return { success: false, error: "Failed to fetch following" };
  }
}

export async function fetchWatched(uid: string) {
  try {
    const snapshot = await getDocs(collection(db, `users/${uid}/watched`));
    const ids = snapshot.docs.map(doc => doc.id);
    return { success: true, data: ids };
  } catch (error) {
    return { success: false, error: "Failed to fetch watched" };
  }
}
