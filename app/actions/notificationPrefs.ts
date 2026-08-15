"use server";

import { cookies } from "next/headers";
import { getSupabaseServerClient, getSupabaseAdminClient } from "@/lib/supabase/client";
import { runWithSupabaseClient } from "@/lib/supabase/request-context.mjs";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

export type NotificationPreferences = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  notifyLikes: boolean;
  notifyComments: boolean;
  notifyFollows: boolean;
  notifyMessages: boolean;
  notifyGroups: boolean;
  notifyCalls: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: false,
  smsEnabled: false,
  notifyLikes: true,
  notifyComments: true,
  notifyFollows: true,
  notifyMessages: true,
  notifyGroups: true,
  notifyCalls: true,
};

async function withSupabaseRequestContext<T>(
  callback: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: cookieUpdates => {
      cookieUpdates.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    },
  });
  await supabase.auth.getUser();
  return runWithSupabaseClient(supabase, () => callback(supabase));
}

function mapPreferencesRow(row: Record<string, unknown> | null): NotificationPreferences {
  if (!row) return DEFAULT_PREFERENCES;
  return {
    pushEnabled: Boolean(row.push_enabled ?? true),
    emailEnabled: Boolean(row.email_enabled ?? false),
    smsEnabled: Boolean(row.sms_enabled ?? false),
    notifyLikes: Boolean(row.notify_likes ?? true),
    notifyComments: Boolean(row.notify_comments ?? true),
    notifyFollows: Boolean(row.notify_follows ?? true),
    notifyMessages: Boolean(row.notify_messages ?? true),
    notifyGroups: Boolean(row.notify_groups ?? true),
    notifyCalls: Boolean(row.notify_calls ?? true),
  };
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { uid } = await getUserFromSession();
  if (!uid) return DEFAULT_PREFERENCES;

  return withSupabaseRequestContext(async client => {
    const { data, error } = await client
      .from("notification_preferences")
      .select("*")
      .eq("uid", uid)
      .maybeSingle();
    if (error) throw error;
    return mapPreferencesRow(data);
  });
}

export async function updateNotificationPreferences(
  partial: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  return withSupabaseRequestContext(async client => {
    const { data: existing, error: fetchError } = await client
      .from("notification_preferences")
      .select("*")
      .eq("uid", uid)
      .maybeSingle();
    if (fetchError) throw fetchError;

    const current = mapPreferencesRow(existing);
    const next = { ...current, ...partial };

    const row = {
      uid,
      push_enabled: next.pushEnabled,
      email_enabled: next.emailEnabled,
      sms_enabled: next.smsEnabled,
      notify_likes: next.notifyLikes,
      notify_comments: next.notifyComments,
      notify_follows: next.notifyFollows,
      notify_messages: next.notifyMessages,
      notify_groups: next.notifyGroups,
      notify_calls: next.notifyCalls,
      updatedat: new Date().toISOString(),
    };

    const { error } = await client.from("notification_preferences").upsert(row, { onConflict: "uid" });
    if (error) throw error;

    return next;
  });
}

export async function savePushSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withSupabaseRequestContext(async client => {
    const { error } = await client.from("push_subscriptions").upsert(
      {
        id: crypto.randomUUID(),
        uid,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: "endpoint" }
    );
    if (error) throw error;
  });
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withSupabaseRequestContext(async client => {
    const { error } = await client
      .from("push_subscriptions")
      .delete()
      .eq("uid", uid)
      .eq("endpoint", endpoint);
    if (error) throw error;
  });
}

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return true;
  if (!vapidPublicKey || !vapidPrivateKey) return false;
  webpush.setVapidDetails("mailto:support@perfekthub.app", vapidPublicKey, vapidPrivateKey);
  vapidConfigured = true;
  return true;
}

type PushCategory = "likes" | "comments" | "follows" | "messages" | "groups" | "calls";

const CATEGORY_COLUMN: Record<PushCategory, keyof NotificationPreferences> = {
  likes: "notifyLikes",
  comments: "notifyComments",
  follows: "notifyFollows",
  messages: "notifyMessages",
  groups: "notifyGroups",
  calls: "notifyCalls",
};

// Called from sendNotification (app/actions/notifications.ts) so every
// existing notification call site gets push delivery for free, rather than
// needing each one updated individually. Uses the admin client since this
// runs on behalf of the RECIPIENT, not the currently-authenticated caller
// (e.g. someone else liking your post triggers a push to you).
export async function sendPushToUser(
  uid: string,
  category: PushCategory,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!ensureVapidConfigured()) return;

  const admin = getSupabaseAdminClient();

  const { data: prefRow } = await admin
    .from("notification_preferences")
    .select("push_enabled, " + `notify_${category}`)
    .eq("uid", uid)
    .maybeSingle();

  const prefs = mapPreferencesRow(prefRow as Record<string, unknown> | null);
  if (!prefs.pushEnabled || !prefs[CATEGORY_COLUMN[category]]) return;

  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("uid", uid);
  if (error || !subscriptions || subscriptions.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async sub => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint as string,
            keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
          },
          body
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404/410 means the browser subscription is gone for good (user
        // uninstalled, cleared data, etc.) — clean it up so we stop trying.
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint as string);
        } else {
          console.error("Push send failed:", err);
        }
      }
    })
  );
}

// The in-app incoming-call banner only ever reaches someone already on
// the page — reported live as "the receiver doesn't know they are
// called". Stream's ring state defaults to a 15s timeout (dashboard-only
// setting, not something this call controls), so unless the receiver is
// already staring at the tab, they'll never see or hear it in time. A
// push notification reaches them even with the tab backgrounded or
// closed. Caller identity is looked up server-side from the
// authenticated session rather than trusted from the client, so this
// can't be used to send an arbitrary spoofed "incoming call" push.
export async function notifyIncomingCall(targetUid: string): Promise<void> {
  const { uid: callerUid } = await getUserFromSession();
  if (!callerUid || !targetUid || callerUid === targetUid) return;

  try {
    const admin = getSupabaseAdminClient();
    const { data: caller } = await admin
      .from("users")
      .select("fullname, username")
      .eq("uid", callerUid)
      .maybeSingle();

    const callerName =
      (caller?.fullname as string) || (caller?.username as string) || "Someone";

    await sendPushToUser(targetUid, "calls", {
      title: "Incoming call",
      body: `${callerName} is calling you`,
      url: "/messages",
    });
  } catch (err) {
    console.error("notifyIncomingCall failed:", err);
  }
}
