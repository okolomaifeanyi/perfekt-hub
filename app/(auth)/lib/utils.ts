import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {
  signInWithEmailAndPassword,
  signOut,
  UserCredential,
  User,
  getAdditionalUserInfo,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { useUserStore } from "@/lib/store/useUserStore";


export async function loginClient(identifier: string, password: string) {
  try {
    let email = identifier.trim().toLowerCase();

    // If it's not an email, treat it as username
    if (!email.includes("@")) {
      const q = query(collection(db, "users"), where("username", "==", email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { error: "No user found with this username." };
      }

      // Assume username is unique, get the email
      const userData = snapshot.docs[0].data();
      email = userData.email?.toLowerCase();

      if (!email) {
        return { error: "Username found but no email attached to account." };
      }
    }

    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    const token = await user.getIdToken();

    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) throw new Error("Failed to create session");

    const uid = user.uid;
    if (!uid) throw new Error("User UID is undefined.");

    await updateDoc(doc(db, "users", uid), {
      lastLoginAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Login error:", error);

    let message = "An unknown error occurred.";
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string"
    ) {
      const code = (error as { code: string }).code;
      if (code === "auth/user-not-found") {
        message = "No user found with this email or username.";
      } else if (code === "auth/wrong-password") {
        message = "Incorrect password.";
      } else if (code === "auth/invalid-email") {
        message = "Invalid email address.";
      }
    }

    return { error: message };
  }
}

export async function logoutClient(router: AppRouterInstance) {
  const { clearUser } = useUserStore.getState();

  try {
    const uid = auth.currentUser?.uid;

    if (uid) {
      await updateDoc(doc(db, "users", uid), {
        lastLogoutAt: serverTimestamp(),
      });
    }

    await signOut(auth);
  } catch (err) {
    console.warn("⚠️ Firebase signOut or Firestore update failed:", err);
  }

  try {
    await fetch("/api/logout", {
      method: "POST",
    });
  } catch (err) {
    console.error("⚠️ Error calling /api/logout:", err);
  }

  clearUser();

  // ✅ Proper redirect via Next.js router (no white flash)
  router.push("/login");
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove special characters
    .replace(/\s+/g, "-"); // replace spaces with hyphens
}

async function generateUniqueUsername(displayName: string): Promise<string> {
  const base = slugify(displayName);
  let username = base;
  let suffix = 1;

  const usersRef = collection(db, "users");

  while (true) {
    const q = query(usersRef, where("username", "==", username));
    const snapshot = await getDocs(q);

    if (snapshot.empty) break;

    username = `${base}-${suffix}`;
    suffix++;
  }

  return username;
}

export const saveOrUpdateUser = async (
  user: User,
  result: UserCredential,
  isNewUserFlag?: boolean
) => {
  const userRef = doc(db, "users", user.uid);

  const isNewUser =
    isNewUserFlag ??
    getAdditionalUserInfo(result)?.isNewUser ??
    !(await getDoc(userRef)).exists();

  const baseData = {
    email: user.email ?? "",
    lastLoginAt: serverTimestamp(),
  };

  if (isNewUser) {
    const newUserData = {
      uid: user.uid,
      username: await generateUniqueUsername(user.displayName ?? "user"),
      fullName: user.displayName ?? "",
      photoURL: user.photoURL ?? "",
      phoneNumber: user.phoneNumber ?? "",
      createdAt: serverTimestamp(),
      providerId: getAdditionalUserInfo(result)?.providerId ?? "unknown",
      completedProfile: false,
      randomKey: Math.random(),
      postsCount: 0,
    };

    await setDoc(userRef, { ...baseData, ...newUserData }, { merge: true });
  } else {
    await setDoc(userRef, baseData, { merge: true });
  }
};
