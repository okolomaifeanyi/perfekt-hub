/* eslint-disable @typescript-eslint/no-unused-vars */
import { db } from "@/lib/supabase";
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
  updateDoc,
  increment,
} from "@/lib/supabase";
import { toast } from "sonner";
import { getAuth } from "@/lib/supabase";
const auth = getAuth();

async function deleteChildrenPosts(parentId: string) {
  // Find replies
  const repliesQ = query(
    collection(db, "posts"),
    where("parentPostId", "==", parentId)
  );
  const repliesSnap = await getDocs(repliesQ);

  for (const reply of repliesSnap.docs) {
    await deletePost(reply.id, true); // recursive delete
  }

  // Find quotes
  const quotesQ = query(
    collection(db, "posts"),
    where("quotePostId", "==", parentId)
  );
  const quotesSnap = await getDocs(quotesQ);

  for (const quote of quotesSnap.docs) {
    await deletePost(quote.id, true); // recursive delete
  }
}

export async function deletePost(postId: string, skipAuthCheck = false) {
  const user = auth.currentUser;
  if (!user && !skipAuthCheck) {
    toast.error("Not signed in", { position: "top-right" });
    return;
  }

  try {
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      if (!skipAuthCheck)
        toast.error("Post not found", { position: "top-right" });
      return;
    }

    const post = postSnap.data();

    if (!skipAuthCheck && post?.userId !== user?.uid) {
      toast.error("You can't delete this post", { position: "top-right" });
      return;
    }

    // 🔽 Decrement parent’s reply count
    if (post?.parentPostId) {
      const parentRef = doc(db, "posts", post.parentPostId);
      await updateDoc(parentRef, { replyCount: increment(-1) });
    }

    // 🔽 Decrement quoted post’s quote count
    if (post?.quotePostId) {
      const quotedRef = doc(db, "posts", post.quotePostId);
      await updateDoc(quotedRef, { quoteCount: increment(-1) });
    }

    // 🔁 Recursively delete children replies & quotes
    await deleteChildrenPosts(postId);

    // ❌ Delete actual post
    await deleteDoc(postRef);

    if (!skipAuthCheck)
      toast.success("Post deleted successfully", { position: "top-right" });
  } catch (err) {
    console.error("deletePost:", err);
    if (!skipAuthCheck)
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
      where("isPinned", "==", true)
    );

    const pinnedSnapshot = await getDocs(pinnedQuery);
    const batch = writeBatch(db);

    pinnedSnapshot.forEach(docSnap => {
      batch.update(docSnap.ref, {
        isPinned: false,
      });
    });

    const postRef = doc(db, "posts", postId);
    batch.update(postRef, {
      isPinned: true,
    });

    await batch.commit();

    toast.success("Post pinned successfully");
  } catch (err) {
    console.error("pinPost error:", err);
    toast.error("Failed to pin post");
  }
}

export async function toggleSavedPost(
  postId: string,
  userId: string,
  isSaved: boolean
) {
  try {
    const ref = doc(db, `users/${userId}/savedPosts`, postId);
    if (isSaved) {
      await deleteDoc(ref);
      toast.success("Removed from saved posts");
    } else {
      await setDoc(ref, {});
      toast.success("Saved");
    }
  } catch (err) {
    console.error("toggleSavedPost:", err);
    toast.error("Failed to update saved posts");
    throw err;
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
