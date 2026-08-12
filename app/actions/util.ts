import { firestoreAdmin } from "@/lib/supabase";

export async function deleteChildrenPosts(parentId: string): Promise<void> {
  const db = firestoreAdmin;

  const [repliesSnap, quotesSnap] = await Promise.all([
    db.collection("posts").where("parentPostId", "==", parentId).get(),
    db.collection("posts").where("quotePostId", "==", parentId).get(),
  ]);

  const children = [...repliesSnap.docs, ...quotesSnap.docs];
  if (children.length === 0) return;

  const batch = db.batch();
  for (const child of children) {
    batch.delete(child.ref);
  }
  await batch.commit();

  // Recurse in parallel
  await Promise.all(children.map(child => deleteChildrenPosts(child.id)));
}