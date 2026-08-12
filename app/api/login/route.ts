import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ message: "Authentication failed" }, { status: 401 });
  }

  return NextResponse.json(
    { message: "Logged in successfully", uid: data.user.id },
    { status: 200 }
  );
}

