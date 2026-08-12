"use server";

import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import { runWithSupabaseClient } from "@/lib/supabase/request-context.mjs";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";
import type { SupabaseClient } from "@supabase/supabase-js";

export type EventProps = {
  id: string;
  title: string;
  description: string;
  location: string;
  startTime: string;
  isPrivate: boolean;
  ownerUid: string;
  attendeesCount: number;
  createdAt: string;
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

function mapEventRow(row: Record<string, unknown>): EventProps {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    location: (row.location as string) ?? "",
    startTime: row.starttime as string,
    isPrivate: Boolean(row.isprivate),
    ownerUid: row.owneruid as string,
    attendeesCount: (row.attendeescount as number) ?? 0,
    createdAt: row.createdat as string,
  };
}

export async function listUpcomingEvents(limit = 20): Promise<EventProps[]> {
  return withSupabaseRequestContext(async client => {
    const { data, error } = await client
      .from("events")
      .select("*")
      .gte("starttime", new Date().toISOString())
      .order("starttime", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(mapEventRow);
  });
}

export async function createEvent(input: {
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  isPrivate?: boolean;
}): Promise<EventProps> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");
  if (!input.title.trim()) throw new Error("Event title is required");
  if (Number.isNaN(new Date(input.startTime).getTime())) {
    throw new Error("A valid start time is required");
  }

  return withSupabaseRequestContext(async client => {
    const id = crypto.randomUUID();
    const { error: eventError } = await client.from("events").insert({
      id,
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      location: input.location?.trim() ?? "",
      starttime: input.startTime,
      isprivate: input.isPrivate ?? false,
      owneruid: uid,
      attendeescount: 1,
    });
    if (eventError) throw eventError;

    const { error: rsvpError } = await client
      .from("event_rsvps")
      .insert({ id: crypto.randomUUID(), eventid: id, uid });
    if (rsvpError) throw rsvpError;

    return {
      id,
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      location: input.location?.trim() ?? "",
      startTime: input.startTime,
      isPrivate: input.isPrivate ?? false,
      ownerUid: uid,
      attendeesCount: 1,
      createdAt: new Date().toISOString(),
    };
  });
}

async function syncAttendeesCount(client: SupabaseClient, eventId: string) {
  const { count, error } = await client
    .from("event_rsvps")
    .select("id", { count: "exact", head: true })
    .eq("eventid", eventId);
  if (error) throw error;

  await client.from("events").update({ attendeescount: count ?? 0 }).eq("id", eventId);
}

export async function rsvpToEvent(eventId: string): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withSupabaseRequestContext(async client => {
    const { error } = await client
      .from("event_rsvps")
      .insert({ id: crypto.randomUUID(), eventid: eventId, uid });
    if (error) throw error;

    await syncAttendeesCount(client, eventId);
  });
}

export async function cancelRsvp(eventId: string): Promise<void> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  await withSupabaseRequestContext(async client => {
    const { error } = await client
      .from("event_rsvps")
      .delete()
      .eq("eventid", eventId)
      .eq("uid", uid);
    if (error) throw error;

    await syncAttendeesCount(client, eventId);
  });
}
