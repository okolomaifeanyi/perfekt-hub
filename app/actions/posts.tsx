"use server";

import { cookies } from "next/headers";
import { firestoreAdmin } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { runWithSupabaseClient } from "@/lib/supabase/request-context.mjs";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import { deleteChildrenPosts } from "./util";

async function withSupabaseRequestContext<T>(
  callback: () => Promise<T>
): Promise<T> {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: cookieUpdates => {
      cookieUpdates.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    },
  });

  // The @supabase/ssr server client initializes its session lazily
  // (skipAutoInitialize), so no JWT is attached until an auth method runs and
  // every query before that executes as the `anon` role. Hydrate it first so
  // RLS sees the real user.
  await supabase.auth.getUser();

  return runWithSupabaseClient(supabase, callback);
}

export async function deletePostAction(postId: string): Promise<void> {
  if (!postId) {
    throw new Error("postId is required");
  }

  const { uid } = await getUserFromSession();
  if (!uid) {
    throw new Error("You must be signed in to delete posts");
  }

  await withSupabaseRequestContext(async () => {
    const db = firestoreAdmin;
    const postRef = db.doc(`posts/${postId}`);
    const postSnap = await postRef.get();

    if (!postSnap.exists()) {
      throw new Error("Post not found");
    }

    const post = postSnap.data()!;
    if (post.userId !== uid) {
      throw new Error("You can only delete your own posts");
    }

    const batch = db.batch();

    const engSnap = await postRef.collection("engagements").get();
    for (const eng of engSnap.docs) {
      batch.delete(eng.ref);
    }

    batch.delete(postRef);

    await batch.commit();

    await deleteChildrenPosts(postId);
  });
}
