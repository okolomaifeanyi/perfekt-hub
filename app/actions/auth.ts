"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FormState, SignupFormSchema } from "@/lib/definitions";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { generateUniqueUsername } from "@/lib/supabase/user-profile-rpc.mjs";
import { toSupabaseUserRow } from "@/lib/supabase/user-profile.mjs";
import { checkRateLimit } from "@/lib/rate-limit.mjs";

export async function signup(_state: FormState, formData: FormData) {
  if (!(await checkRateLimit("signup", 5, 3600))) {
    return {
      success: false,
      message: "Too many signup attempts. Please try again in a while.",
      values: {
        username: formData.get("username") as string,
        email: formData.get("email") as string,
      },
    };
  }

  const validatedFields = SignupFormSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    password2: formData.get("password2"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      values: {
        username: formData.get("username") as string,
        email: formData.get("email") as string,
      },
    };
  }

  const { username, email, password } = validatedFields.data;
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: cookieUpdates => {
      cookieUpdates.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    },
  });

  try {
    const uniqueUsername = await generateUniqueUsername(supabase, username);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: uniqueUsername,
          fullName: username,
        },
      },
    });

    if (error) {
      const message =
        error.message.includes("User already registered")
          ? "This email is already registered. Try logging in."
          : error.message;

      return {
        success: false,
        message,
        values: { username, email },
      };
    }

    if (!data.user) {
      return {
        success: false,
        message: "Unable to create your account.",
        values: { username, email },
      };
    }

    if (data.session) {
      const { error: profileError } = await supabase.from("users").upsert(
        toSupabaseUserRow({
          uid: data.user.id,
          email,
          username: uniqueUsername,
          fullName: username,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          completedProfile: false,
          postsCount: 0,
          followersCount: 0,
          followingCount: 0,
          friendsCount: 0,
          randomKey: Math.random(),
          providerId: data.user.app_metadata?.provider ?? "supabase",
          fullName_lowercase: username.toLowerCase(),
        }),
        { onConflict: "uid" }
      );

      if (profileError) {
        return {
          success: false,
          message: profileError.message,
          values: { username, email },
        };
      }

      redirect("/");
    }

    return {
      success: true,
      message:
        "Account created. Check your email to verify your account, then sign in.",
      values: { username, email },
    };
  } catch (error: unknown) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unknown error occurred. Please try again.",
      values: { username, email },
    };
  }
}
