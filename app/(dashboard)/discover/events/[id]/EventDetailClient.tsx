"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarDays, Globe, Lock, MapPin, Settings, Trash2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUserStore } from "@/lib/store/useUserStore";
import { userAltImageUrl } from "@/components/UserAltImageUrl";
import {
  cancelRsvp,
  deleteEvent,
  rsvpToEvent,
  updateEventSettings,
  type EventDetail,
} from "@/app/actions/events";

function toDateTimeLocal(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function EventSettingsDialog({ detail }: { detail: EventDetail }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(detail.event.title);
  const [description, setDescription] = useState(detail.event.description);
  const [location, setLocation] = useState(detail.event.location);
  const [startTime, setStartTime] = useState(toDateTimeLocal(detail.event.startTime));
  const [isPrivate, setIsPrivate] = useState(detail.event.isPrivate);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEventSettings(detail.event.id, {
        title,
        description,
        location,
        startTime: new Date(startTime).toISOString(),
        isPrivate,
      });
      toast.success("Event updated");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${detail.event.title}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await deleteEvent(detail.event.id);
      toast.success("Event deleted");
      router.push("/discover/events");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete event");
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-1.5 size-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Event settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-event-title">Title</Label>
            <Input
              id="settings-event-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-event-start">Starts</Label>
            <Input
              id="settings-event-start"
              type="datetime-local"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-event-location">Location</Label>
            <Input
              id="settings-event-location"
              value={location}
              onChange={e => setLocation(e.target.value)}
              maxLength={140}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-event-description">Description</Label>
            <Textarea
              id="settings-event-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={280}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={e => setIsPrivate(e.target.checked)}
              className="size-4"
            />
            Private event (hidden from public event listings)
          </label>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save changes"}
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="mr-1.5 size-4" />
            {deleting ? "Deleting..." : "Delete event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EventDetailClient({ detail }: { detail: EventDetail }) {
  const currentUid = useUserStore(state => state.user?.uid);
  const [isAttending, setIsAttending] = useState(detail.isAttending);
  const [attendeesCount, setAttendeesCount] = useState(detail.event.attendeesCount);
  const [attendees, setAttendees] = useState(detail.attendees);
  const [busy, setBusy] = useState(false);

  const isOwner = detail.event.ownerUid === currentUid;

  const handleRsvp = async () => {
    setBusy(true);
    try {
      await rsvpToEvent(detail.event.id);
      setIsAttending(true);
      setAttendeesCount(prev => prev + 1);
      if (currentUid) {
        setAttendees(prev => [...prev, { uid: currentUid, username: "", fullName: "You", photoURL: null }]);
      }
      toast.success("You're going!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to RSVP");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    try {
      await cancelRsvp(detail.event.id);
      setIsAttending(false);
      setAttendeesCount(prev => Math.max(0, prev - 1));
      setAttendees(prev => prev.filter(a => a.uid !== currentUid));
      toast.success("RSVP cancelled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel RSVP");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold">{detail.event.title}</h1>
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              {detail.event.isPrivate ? <Lock className="size-3" /> : <Globe className="size-3" />}
              {detail.event.isPrivate ? "Private" : "Public"}
            </Badge>
          </div>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {format(new Date(detail.event.startTime), "EEEE, MMM d, yyyy · h:mm a")}
            </p>
            {detail.event.location && (
              <p className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {detail.event.location}
              </p>
            )}
            <p className="flex items-center gap-1.5">
              <Users className="size-4" />
              {attendeesCount} going
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {isOwner && <EventSettingsDialog detail={detail} />}
          {isAttending ? (
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={busy}>
              Cancel RSVP
            </Button>
          ) : (
            <Button size="sm" onClick={handleRsvp} disabled={busy}>
              RSVP
            </Button>
          )}
        </div>
      </div>

      {detail.event.description && (
        <p className="text-sm leading-relaxed text-muted-foreground">{detail.event.description}</p>
      )}

      <div>
        <h2 className="mb-2 text-base font-semibold">Attendees ({attendeesCount})</h2>
        {attendees.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one has RSVP&apos;d yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {attendees.map(attendee => (
              <div key={attendee.uid} className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-3">
                <Avatar className="size-7">
                  <AvatarImage
                    src={attendee.photoURL || userAltImageUrl({ name: attendee.fullName || attendee.username || "U" })}
                    alt=""
                  />
                  <AvatarFallback className="text-xs">
                    {(attendee.fullName || attendee.username || "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{attendee.fullName || attendee.username || "You"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
