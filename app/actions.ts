"use server";

import { getMoreComments, getMorePosts, getMoreUserPosts } from "@/lib/data";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { resolveCurrentUid } from "@/lib/auth/current-user.mjs";

export async function loadMore(formData: FormData) {
  try {
    const page = parseInt(formData.get("page") as string);
    const limit = parseInt(formData.get("limit") as string);

    if (isNaN(page) || isNaN(limit)) {
      console.error("Invalid page or limit");
      return { newPosts: [], nextPage: page || 1 };
    }

    const posts = await getMorePosts(page, limit);
    return { newPosts: posts, nextPage: page + 1 };
  } catch (error) {
    console.error("Server Action: Error in loadMore:", error);
    return { newPosts: [], nextPage: 1 };
  }
}


export async function loadMoreUserPosts(
  prevState: unknown,
  formData: FormData
) {
  try {
    const page = parseInt(formData.get("page") as string);
    const limit = parseInt(formData.get("limit") as string);
    const userId = formData.get("userId") as string;

    // Check if parsing worked
    if (isNaN(page) || isNaN(limit)) {
      console.error("Server Action: Invalid page or limit parsed.");
      return { newPosts: [], nextPage: page };
    }

    const posts = await getMoreUserPosts(userId, page, limit);

    return { newPosts: posts, nextPage: page + 1 };
  } catch (error) {
    console.error("Server Action: Error in loadMore:", error);
    return { newPosts: [], nextPage: 1 };
  }
}

export async function loadMoreComments(prevState: unknown, formData: FormData) {
  const page = parseInt(formData.get("page") as string);
  const limit = parseInt(formData.get("limit") as string);
  const id = formData.get("id") as string;
  const comments = await getMoreComments(id, limit, page);
  return { newComments: comments, nextPage: page + 1 };
}

export async function getCurrentUid(
  req: Request
): Promise<{ uid: string } | NextResponse> {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: cookieUpdates => {
      cookieUpdates.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    },
  });

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const uid = await resolveCurrentUid({
    supabase,
    bearerToken: token,
  });

  if (uid) {
    return { uid };
  }

  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  return NextResponse.json({ error: "Invalid token" }, { status: 401 });
}
