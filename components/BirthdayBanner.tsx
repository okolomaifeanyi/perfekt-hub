"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PartyPopper, X } from "lucide-react";
import { useUserStore } from "@/lib/store/useUserStore";
import { isBirthdayToday } from "@/lib/dob.mjs";

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

// Deliberately plain localStorage rather than the persisted user store —
// this only needs to remember "dismissed for today," which resets itself
// naturally every year without needing any reset-on-auth-transition logic
// the way the store's dismissedProfileModal flag does.
function dismissalKey(uid: string) {
  return `birthday-banner-dismissed-${uid}`;
}

export function BirthdayBanner() {
  const user = useUserStore(state => state.user);
  // Starts hidden and only reveals itself after the effect below checks
  // localStorage — localStorage isn't available during SSR, so rendering
  // based on it synchronously would mismatch the server-rendered markup.
  const [visible, setVisible] = useState(false);

  const isBirthday = Boolean(user?.dob && isBirthdayToday(user.dob));

  useEffect(() => {
    if (!user?.uid || !isBirthday) {
      setVisible(false);
      return;
    }
    setVisible(localStorage.getItem(dismissalKey(user.uid)) !== todayKey());
  }, [user?.uid, isBirthday]);

  if (!visible || !user) return null;

  const firstName = user.fullName?.split(" ")[0] || user.username;
  const eventId = `birthday-${user.uid}-${new Date().getFullYear()}`;

  return (
    <div className="mb-3 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
      <PartyPopper className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Happy Birthday, {firstName}! 🎉</p>
        <p className="text-xs text-muted-foreground">
          Everyone at Perfekthub wishes you an amazing day.
        </p>
      </div>
      <Link
        href={`/discover/events/${eventId}`}
        className="shrink-0 text-xs font-medium text-primary hover:underline"
      >
        View
      </Link>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(dismissalKey(user.uid), todayKey());
          setVisible(false);
        }}
        aria-label="Dismiss"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
