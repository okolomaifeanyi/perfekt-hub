import { NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";
import { isPublicPath } from "@/lib/public-routes.mjs";

const authRoutes = ["/login", "/signup"];
// icon-192/icon-512 are the PWA manifest's icons and /offline is the
// service worker's offline fallback — the matcher below only skips paths
// with a file extension (sw.js, manifest.webmanifest), so these
// extension-less routes still hit this middleware. Without this, a logged-
// out visitor's manifest icon fetches (and the offline page itself, whose
// whole point is working without a session) got redirected to /login
// instead of returning the icon/page.
const publicRoutes = [...authRoutes, "/auth/callback", "/icon-192", "/icon-512", "/offline"];
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
  // publicRoutes above are infrastructure/auth plumbing routes a signed-out
  // visitor's browser hits regardless of intent (manifest icons, the
  // offline fallback). isPublicPath is the separate, deliberately narrow
  // allowlist of actual app content a guest can browse — see that file for
  // why it's an allowlist (home feed, /discover, an individual post) rather
  // than opening everything not explicitly listed here.
  const isPublic =
    publicRoutes.some(route => matchesRoute(path, route)) || isPublicPath(path);
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
