"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarDays, Loader2, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SortToggle, type ListSortMode } from "@/components/discover/SortToggle";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { listUpcomingEventsPage, rsvpToEvent, type EventProps } from "@/app/actions/events";
import { useUserStore } from "@/lib/store/useUserStore";

function EventCardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border p-5">
      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      <div className="h-3 w-32 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function EventsListClient() {
  const currentUid = useUserStore(state => state.user?.uid);
  const [rsvpedIds, setRsvpedIds] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<ListSortMode>("time");

  const { items: events, loading, loadingMore, hasMore, sentinelRef } = useInfiniteList<EventProps>({
    sortMode,
    pageSize: 20,
    fetchPage: ({ offset, sortMode: mode, limit }) =>
      listUpcomingEventsPage({ offset, sortMode: mode as ListSortMode, limit }),
  });

  const handleRsvp = async (eventId: string) => {
    setRsvpedIds(prev => new Set(prev).add(eventId));
    try {
      await rsvpToEvent(eventId);
      toast.success("You're going!");
    } catch {
      setRsvpedIds(prev => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
      toast.error("Failed to RSVP");
    }
  };

  return (
    <div className="space-y-4">
      <SortToggle value={sortMode} onChange={setSortMode} engagementLabel="Most going" />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="py-8">
          <CardContent className="text-center text-sm text-muted-foreground">
            No upcoming events yet — be the first to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map(event => {
            const isDone = rsvpedIds.has(event.id) || event.ownerUid === currentUid;
            return (
              <Card key={event.id} className="py-5">
                <Link href={`/discover/events/${event.id}`} className="block">
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-base hover:underline">{event.title}</CardTitle>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" />
                        {new Date(event.startTime).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      {event.location && (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="size-3.5" />
                          {event.location}
                        </p>
                      )}
                      <p className="flex items-center gap-1.5">
                        <Users className="size-3.5" />
                        {event.attendeesCount} going
                      </p>
                    </div>
                  </CardHeader>
                </Link>
                <CardContent className="space-y-3">
                  {event.description && (
                    <p className="line-clamp-3 text-sm text-muted-foreground">{event.description}</p>
                  )}
                  <Button
                    size="sm"
                    variant={isDone ? "outline" : "default"}
                    disabled={isDone}
                    onClick={() => handleRsvp(event.id)}
                  >
                    {isDone ? "Going" : "RSVP"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />
      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {!hasMore && events.length > 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">You&apos;ve reached the end.</p>
      )}
    </div>
  );
}
