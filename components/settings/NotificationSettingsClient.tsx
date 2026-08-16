"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Loader2, Mail, MessageSquareText, Smartphone } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/app/actions/notificationPrefs";
import { ToggleRow } from "@/components/settings/ToggleRow";

const CATEGORY_ROWS: { key: keyof NotificationPreferences; label: string }[] = [
  { key: "notifyLikes", label: "Likes and reactions" },
  { key: "notifyComments", label: "Comments, replies, and mentions" },
  { key: "notifyFollows", label: "New followers and friend requests" },
  { key: "notifyMessages", label: "Direct messages" },
  { key: "notifyGroups", label: "Group activity" },
  { key: "notifyCalls", label: "Incoming calls" },
];

export function NotificationSettingsClient() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const push = usePushNotifications();

  useEffect(() => {
    let active = true;
    getNotificationPreferences()
      .then(result => {
        if (active) setPrefs(result);
      })
      .catch(err => console.error("getNotificationPreferences failed:", err));
    return () => {
      active = false;
    };
  }, []);

  const handleUpdate = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs) return;
    const previous = prefs;
    setPrefs({ ...prefs, [key]: value });
    setSaving(key);
    try {
      await updateNotificationPreferences({ [key]: value });
    } catch (err) {
      setPrefs(previous);
      toast.error(err instanceof Error ? err.message : "Failed to save preference");
    } finally {
      setSaving(null);
    }
  };

  const handlePushToggle = async (value: boolean) => {
    if (value) {
      const granted = await push.subscribe();
      if (!granted) {
        if (push.permission === "denied") {
          toast.error("Notifications are blocked for this site in your browser settings.");
        } else {
          toast.error("Couldn't enable browser notifications.");
        }
        return;
      }
    } else {
      await push.unsubscribe();
    }
    await handleUpdate("pushEnabled", value);
  };

  if (!prefs) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
          <Smartphone className="size-4" />
          Delivery channels
        </h2>
        <p className="mb-2 text-xs text-muted-foreground">
          Choose how you want to hear about activity on Perfekthub.
        </p>

        <div className="divide-y">
          <ToggleRow
            id="push-enabled"
            label="Browser notifications"
            description={
              !push.supported
                ? "Not supported in this browser."
                : push.subscribed
                  ? "Enabled on this device."
                  : "Get notified even when Perfekthub isn't open."
            }
            checked={prefs.pushEnabled && push.subscribed}
            disabled={!push.supported || push.loading || saving === "pushEnabled"}
            onChange={handlePushToggle}
          />
          <ToggleRow
            id="email-enabled"
            label="Email"
            description="Requires connecting an email provider — not available yet."
            checked={false}
            disabled
            onChange={() => {}}
          />
          <ToggleRow
            id="sms-enabled"
            label="SMS"
            description="Requires connecting an SMS provider — not available yet."
            checked={false}
            disabled
            onChange={() => {}}
          />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
          <Bell className="size-4" />
          What you&apos;re notified about
        </h2>
        <p className="mb-2 text-xs text-muted-foreground">
          Applies to whichever channels above are enabled.
        </p>

        <div className="divide-y">
          {CATEGORY_ROWS.map(row => (
            <ToggleRow
              key={row.key}
              id={row.key}
              label={row.label}
              checked={Boolean(prefs[row.key])}
              disabled={saving === row.key}
              onChange={value => handleUpdate(row.key, value)}
            />
          ))}
        </div>
      </section>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Mail className="mt-0.5 size-3.5 shrink-0" />
        Email and SMS delivery aren&apos;t wired up yet — this project doesn&apos;t have a mail or SMS
        provider connected. Browser push notifications work today.
      </p>
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <MessageSquareText className="mt-0.5 size-3.5 shrink-0" />
        Direct-message unread badges always update live regardless of this setting — this only
        controls the separate push notification for a new message.
      </p>
    </div>
  );
}
