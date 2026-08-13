"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Settings, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteGroup, updateGroupSettings, type GroupProps } from "@/app/actions/groups";
import EditImageButton from "@/app/(dashboard)/[username]/components/EditImageButton";

export function GroupSettingsDialog({ group }: { group: GroupProps }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [photoURL, setPhotoURL] = useState(group.photoURL);
  const [wallURL, setWallURL] = useState(group.wallURL);
  const [joinPolicy, setJoinPolicy] = useState<"open" | "admin">(group.joinPolicy ?? "open");
  const [defaultPostVisibility, setDefaultPostVisibility] = useState<"public" | "private">(group.defaultPostVisibility ?? "public");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateGroupSettings(group.id, { name, description, photoURL, wallURL, joinPolicy, defaultPostVisibility });
      toast.success("Group settings updated");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update group");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${group.name}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await deleteGroup(group.id);
      toast.success("Group deleted");
      router.push("/discover/groups");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete group");
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Group settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Wall / cover image */}
          <div className="space-y-1.5">
            <Label>Cover image</Label>
            <div className="relative h-28 w-full overflow-hidden rounded-lg border bg-muted">
              {wallURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={wallURL} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
                  Click the camera to upload cover image
                </span>
              )}
              <EditImageButton
                onChange={url => setWallURL(url)}
                uid={`${group.id}-wall`}
                type="coverImage"
                position="bottom-right"
              />
            </div>
          </div>

          {/* Avatar */}
          <div className="space-y-1.5">
            <Label>Group photo</Label>
            <div className="relative size-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {photoURL && <img src={photoURL} alt="" className="size-16 rounded-full object-cover" />}
              <EditImageButton
                onChange={url => setPhotoURL(url)}
                uid={group.id}
                type="avatar"
                position="bottom-right"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-group-name">Name</Label>
            <Input
              id="settings-group-name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-group-description">Description</Label>
            <Textarea
              id="settings-group-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={280}
            />
          </div>

          <div className="space-y-2">
            <Label>Who can join</Label>
            <Select value={joinPolicy} onValueChange={v => setJoinPolicy(v as "open" | "admin")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Anyone can join</SelectItem>
                <SelectItem value="admin">Requires admin approval</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Default post visibility</Label>
            <Select value={defaultPostVisibility} onValueChange={v => setDefaultPostVisibility(v as "public" | "private")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public (visible to everyone)</SelectItem>
                <SelectItem value="private">Members only</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
            {deleting ? "Deleting..." : "Delete group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
