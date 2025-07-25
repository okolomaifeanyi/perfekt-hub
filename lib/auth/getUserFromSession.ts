import { cookies } from "next/headers";
import { authAdmin } from "@/lib/firebaseAdmin";

export async function getUserFromSession(req?: Request) {
  const cookieStore = req ? req.headers.get("cookie") : cookies().toString();

  const sessionCookie = cookieStore
    ?.split(";")
    .find(c => c.trim().startsWith("session="))
    ?.split("=")[1];

  if (!sessionCookie) return { uid: null };

  try {
    const decoded = await authAdmin.verifySessionCookie(sessionCookie, true);
    return { uid: decoded.uid };
  } catch (err) {
    console.error("Invalid session cookie", err);
    return { uid: null };
  }
}
