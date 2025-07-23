import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/"];
const publicRoutes = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  const path = req.nextUrl.pathname;

  const isProtected = protectedRoutes.some(
    route => path === route || path.startsWith(`${route}/`)
  );

  const isPublic = publicRoutes.some(
    route => path === route || path.startsWith(`${route}/`)
  );

  // 🚫 Public route — allow access unless already authenticated
  if (isPublic) {
    if (session) {
      try {
        const verifyUrl = new URL("/api/verify-session", req.nextUrl.origin);
        const response = await fetch(verifyUrl.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionCookie: session }),
        });

        const data = await response.json();
        if (data.isValid) {
          if (process.env.NODE_ENV === "development") {
            console.log("✅ Already logged in — redirecting to /");
          }
          return NextResponse.redirect(new URL("/", req.url));
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("⚠️ Session check failed on public route:", error);
        }
        // Allow user to view login/signup even if session check fails
      }
    }

    return NextResponse.next();
  }

  // 🔐 Protected route — require session
  if (isProtected) {
    if (!session) {
      if (process.env.NODE_ENV === "development") {
        console.warn("❌ No session — redirecting to /login");
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
      const verifyUrl = new URL("/api/verify-session", req.nextUrl.origin);
      const response = await fetch(verifyUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionCookie: session }),
      });

      const data = await response.json();

      if (data.isValid) {
        if (process.env.NODE_ENV === "development") {
          console.log("✅ Session verified — proceeding to:", path);
        }
        return NextResponse.next();
      } else {
        if (process.env.NODE_ENV === "development") {
          console.warn("⚠️ Invalid session:", data.message);
        }

        const redirectResponse = NextResponse.redirect(
          new URL("/login", req.url)
        );
        redirectResponse.cookies.set("session", "", {
          maxAge: 0,
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
        });
        return redirectResponse;
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("🔥 Error verifying session:", error);
      }

      const redirectResponse = NextResponse.redirect(
        new URL("/login", req.url)
      );
      redirectResponse.cookies.set("session", "", {
        maxAge: 0,
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
      return redirectResponse;
    }
  }

  // ✅ Unprotected route — allow through
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/|_next|favicon.ico|.*\\..*).*)"],
};

