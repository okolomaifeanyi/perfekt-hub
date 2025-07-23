import { authAdmin } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

export async function DELETE(req: Request) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "Missing UID" }, { status: 400 });
    }

    // 1. Delete user from Firebase Auth
    await authAdmin.deleteUser(uid);

    // 2. Recursively delete user data in Firestore
    const pathToDelete = `users/${uid}`;
    await admin
      .firestore()
      .recursiveDelete(admin.firestore().doc(pathToDelete));

    // 3. Optionally delete related collections (like posts, notifications)
    const collectionsToDelete = ["posts", "notifications"];
    for (const col of collectionsToDelete) {
      const snap = await admin
        .firestore()
        .collection(col)
        .where("userId", "==", uid)
        .get();
      const batch = admin.firestore().batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    return NextResponse.json({ message: "User and data deleted" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("❌ Error in recursive delete:", error);
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }
}
