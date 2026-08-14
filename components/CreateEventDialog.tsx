"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createEvent, type EventProps } from "@/app/actions/events";
import { generateDraftDescription } from "@/app/actions/aiDraft";

export function CreateEventDialog({
  trigger,
  onCreated,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  trigger?: React.ReactNode;
  onCreated?: (event: EventProps) => void;
  // When passed, the caller owns the open state entirely and no trigger is
  // rendered — needed for opening this from a menu item (e.g. the
  // composer's "More" dropdown), where nesting a DialogTrigger inside a
  // DropdownMenuItem is a known source of focus/close-timing conflicts
  // between the two Radix primitives.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = isControlled ? onOpenChangeProp ?? (() => {}) : setInternalOpen;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [draftingDescription, setDraftingDescription] = useState(false);

  const handleDraftDescription = async () => {
    if (!title.trim()) {
      toast.error("Add a title first");
      return;
    }
    setDraftingDescription(true);
    try {
      const context = `Event listing. Title: ${title.trim()}${
        location.trim() ? `. Location: ${location.trim()}` : ""
      }. Write a short, inviting description for the event.`;
      const draft = await generateDraftDescription(context);
      setDescription(draft);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate a description");
    } finally {
      setDraftingDescription(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Event title is required");
      return;
    }
    if (!startTime) {
      toast.error("Start time is required");
      return;
    }
    setLoading(true);
    try {
      const event = await createEvent({
        title,
        description,
        location,
        startTime: new Date(startTime).toISOString(),
      });
      toast.success("Event created");
      setOpen(false);
      setTitle("");
      setDescription("");
      setLocation("");
      setStartTime("");
      onCreated?.(event);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline" size="sm">
              <Plus className="mr-1.5 size-4" />
              Create event
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Community Meetup"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-start">Starts</Label>
            <Input
              id="event-start"
              type="datetime-local"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-location">Location</Label>
            <Input
              id="event-location"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Where's it happening?"
              maxLength={140}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="event-description">Description</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => void handleDraftDescription()}
                disabled={draftingDescription || !title.trim()}
              >
                {draftingDescription ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 size-3" />
                )}
                Draft with AI
              </Button>
            </div>
            <Textarea
              id="event-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's this event about?"
              maxLength={280}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
