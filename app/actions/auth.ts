"use server";

import { FormState, SignupFormSchema } from "@/lib/definitions";
import { redirect } from "next/navigation";
import { authAdmin, firestoreAdmin } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function signup(state: FormState, formData: FormData) {
  const validatedFields = SignupFormSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    password2: formData.get("password2"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      values: {
        username: formData.get("username") as string,
        email: formData.get("email") as string,
      },
    };
  }

  const { username, email, password } = validatedFields.data;

  try {
    const user = await authAdmin.createUser({
      email,
      password,
    });

    const usernameSnapshot = await firestoreAdmin
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (!usernameSnapshot.empty) {
      return {
        message: "This username is already taken. Try another one.",
        values: { username, email },
      };
    }

    await firestoreAdmin.collection("users").doc(user.uid).set({
      uid: user.uid,
      username: username,
      email: user.email,
      createdAt: FieldValue.serverTimestamp(),
      randomKey: Math.random(),
    });
  } catch (error: unknown) {
    let message = "An unknown error occurred. Please try again.";

    if (error instanceof Error && "code" in error) {
      const err = error as { code: string; message?: string };
      switch (err.code) {
        case "auth/email-already-exists":
          message = "This email is already registered. Try logging in.";
          break;
        case "auth/invalid-email":
          message = "Please enter a valid email address.";
          break;
        case "auth/invalid-password":
          message = "Password is too weak. It should be at least 6 characters.";
          break;
        case "auth/operation-not-allowed":
          message = "Email/password accounts are not enabled.";
          break;
        default:
          message = err.message || message;
          break;
      }
    }

    return {
      message,
      values: { username, email },
    };
  }

  redirect("/");
}
