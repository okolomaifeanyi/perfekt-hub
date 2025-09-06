"use server";

import { getMoreComments, getMorePosts, getMoreUserPosts } from "@/lib/data";
import { authAdmin } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

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
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  try {
    const decoded = await authAdmin.verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
