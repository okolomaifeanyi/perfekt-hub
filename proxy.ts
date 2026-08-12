import { NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

const authRoutes = ["/login", "/signup"];
const publicRoutes = [...authRoutes, "/auth/callback"];
// "Add another account" (see components/AccountMenu.tsx) sends an already
// signed-in user to /login on purpose, to authenticate a second account
// without disturbing the current session. Without this escape hatch, the
// default "bounce authenticated visitors off the auth pages" redirect below
// fires first and sends them straight back to "/", so the feature can never
// be reached.
const ADD_ACCOUNT_PARAM = "addAccount";

function matchesRoute(path: string, route: string) {
  return path === route || path.startsWith(`${route}/`);
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isAuthRoute = authRoutes.some(route => matchesRoute(path, route));
  const isPublic = publicRoutes.some(route => matchesRoute(path, route));
  const isAddingAccount = req.nextUrl.searchParams.has(ADD_ACCOUNT_PARAM);

  const response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });
  const supabase = createSupabaseMiddlewareClient(req, response);
  // getClaims() verifies the JWT locally against this project's cached
  // asymmetric signing key (WebCrypto) instead of getUser()'s mandatory
  // network round trip to the Auth server on every single request — this
  // middleware runs on every navigation, so that round trip was a fixed tax
  // on every page load. Still cryptographically verified, not just decoded.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  if (isAuthRoute && user && !isAddingAccount) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!isPublic && !user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/|_next|favicon.ico|.*\\..*).*)"],
};
