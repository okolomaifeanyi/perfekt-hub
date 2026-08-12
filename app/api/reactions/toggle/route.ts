import { toggleLikeDislikeAdmin } from "@/app/actions/reactions";
import { cookies } from "next/headers";
import { createRequestSupabaseClient } from "@/lib/supabase/request-client.mjs";
import { resolveCurrentUid } from "@/lib/auth/current-user.mjs";
import { runWithSupabaseClient } from "@/lib/supabase/request-context.mjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const postId = typeof body?.postId === "string" ? body.postId : "";
  const type = body?.type;

  if (!postId || (type !== "like" && type !== "dislike")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const { supabase, bearerToken } = createRequestSupabaseClient({
    authorizationHeader: req.headers.get("authorization"),
    cookieStore: {
      getAll: () => cookieStore.getAll(),
      setAll: cookieUpdates => {
        cookieUpdates.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const uid = await resolveCurrentUid({
    supabase,
    bearerToken,
  });

  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updatedCounts = await runWithSupabaseClient(supabase, () =>
    toggleLikeDislikeAdmin({ postId, userId: uid, type })
  );

  return NextResponse.json(updatedCounts);
}
