import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";

function resolveNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = resolveNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const response = NextResponse.redirect(new URL(nextPath, origin));
  const supabase = getSupabaseServerClient({
    getAll: () => request.cookies.getAll(),
    setAll: cookies => {
      cookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback exchange failed:", error);
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("authError", error.message);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
