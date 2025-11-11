// app/api/search/route.ts
import { searchUsersAndPosts } from "@/app/(dashboard)/search/search";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) return NextResponse.json({ users: [], posts: [] });

  const { users, posts } = await searchUsersAndPosts(q);
  return NextResponse.json({ users, posts });
}
