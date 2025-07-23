"use server";

import { getMoreComments, getMorePosts, getMoreUserPosts } from "@/lib/data";

export async function loadMore(prevState: unknown, formData: FormData) {
  try {
    const page = parseInt(formData.get("page") as string);
    const limit = parseInt(formData.get("limit") as string);

    // Check if parsing worked
    if (isNaN(page) || isNaN(limit)) {
      console.error("Server Action: Invalid page or limit parsed.");
      return { newPosts: [], nextPage: page };
    }

    const posts = await getMorePosts(page, limit);

    return { newPosts: posts, nextPage: page + 1 };
  } catch (error) {
    console.error("Server Action: Error in loadMore:", error); // ADD THIS
    // You might want to return an error state or empty posts in case of failure
    return { newPosts: [], nextPage: 1 }; // Or original page, depending on desired fallback
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
  const comments = await getMoreComments(id, limit ,page);
  return { newComments: comments, nextPage: page + 1 };
}
