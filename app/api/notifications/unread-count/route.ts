import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRequestSupabaseClient } from "@/lib/supabase/request-client.mjs";
import { firestoreAdmin } from "@/lib/supabase";
import { countUnreadNotificationsForUser } from "@/lib/notification-count.mjs";
import { runWithSupabaseClient } from "@/lib/supabase/request-context.mjs";
import { resolveCurrentUid } from "@/lib/auth/current-user.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const { supabase, bearerToken } = createRequestSupabaseClient({
    authorizationHeader: request.headers.get("authorization"),
    cookieStore: {
      getAll: () => cookieStore.getAll(),
      setAll: cookieUpdates => {
        cookieUpdates.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const userId = await resolveCurrentUid({
    supabase,
    bearerToken,
  });

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await runWithSupabaseClient(supabase, () =>
      countUnreadNotificationsForUser({
        firestore: firestoreAdmin,
        userId,
      })
    );

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error in /api/notifications/unread-count", error);
    return NextResponse.json(
      { error: "Unable to load unread notifications" },
      { status: 500 }
    );
  }
}
