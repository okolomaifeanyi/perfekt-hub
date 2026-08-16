import { getSupabaseAdminClient } from "@/lib/supabase/client";
import { isBirthdayToday } from "@/lib/dob.mjs";

// Deterministic id, not crypto.randomUUID() — this IS the dedup key. A
// cron that ran twice in the same day (a retry, a manual re-trigger) would
// otherwise create a second birthday event for the same person; checking
// for this exact id first (see below) makes a re-run a no-op instead.
function birthdayEventId(uid, year) {
  return `birthday-${uid}-${year}`;
}

export async function runBirthdayIngestion() {
  const admin = getSupabaseAdminClient();
  const now = new Date();

  const { data: users, error } = await admin
    .from("users")
    .select("uid, fullname, dob")
    .not("dob", "is", null);
  if (error) throw new Error(`runBirthdayIngestion: ${error.message}`);

  const birthdayUsers = (users ?? []).filter(user => isBirthdayToday(user.dob, now));
  const year = now.getFullYear();

  let created = 0;
  let skipped = 0;

  for (const user of birthdayUsers) {
    const eventId = birthdayEventId(user.uid, year);

    const { data: existing, error: existingError } = await admin
      .from("events")
      .select("id")
      .eq("id", eventId)
      .maybeSingle();
    if (existingError) throw new Error(`runBirthdayIngestion: ${existingError.message}`);
    if (existing) {
      skipped += 1;
      continue;
    }

    const name = user.fullname?.trim() || "This user";
    const { error: insertError } = await admin.from("events").insert({
      id: eventId,
      title: `${name}'s Birthday`,
      description: `It's ${name}'s birthday today — stop by and wish them well!`,
      location: "",
      starttime: now.toISOString(),
      isprivate: false,
      owneruid: user.uid,
      attendeescount: 1,
      eventtype: "birthday",
    });
    if (insertError) throw new Error(`runBirthdayIngestion: ${insertError.message}`);

    // Matches createEvent's own behavior — the owner is always attending
    // their own event from the moment it exists.
    const { error: rsvpError } = await admin
      .from("event_rsvps")
      .insert({ id: crypto.randomUUID(), eventid: eventId, uid: user.uid });
    if (rsvpError) throw new Error(`runBirthdayIngestion: ${rsvpError.message}`);

    created += 1;
  }

  return { created, skipped, birthdaysToday: birthdayUsers.length };
}
