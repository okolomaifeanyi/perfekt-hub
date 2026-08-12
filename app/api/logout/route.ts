import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/client";

export async function POST() {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: cookies => {
      cookies.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    },
  });

  await supabase.auth.signOut();

  return NextResponse.json({ message: "Logged out successfully" }, { status: 200 });
}

