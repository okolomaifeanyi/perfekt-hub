"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Settings, Trash2 } from "lucide-react";
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
import { uploadToCloudinary } from "@/components/post-composer/utils";

export function GroupSettingsDialog({ group }: { group: GroupProps }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [photoURL, setPhotoURL] = useState(group.photoURL);
  const [wallURL, setWallURL] = useState(group.wallURL);
  const [joinPolicy, setJoinPolicy] = useState<"open" | "admin">(group.joinPolicy ?? "open");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingWall, setUploadingWall] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const wallInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelected = async (file: File | undefined) => {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const result = await uploadToCloudinary(file);
      setPhotoURL(result.secure_url);
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleWallSelected = async (file: File | undefined) => {
    if (!file) return;
    setUploadingWall(true);
    try {
      const result = await uploadToCloudinary(file);
      setWallURL(result.secure_url);
    } catch {
      toast.error("Failed to upload wall image");
    } finally {
      setUploadingWall(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateGroupSettings(group.id, { name, description, photoURL, wallURL, joinPolicy });
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
            <button
              type="button"
              onClick={() => wallInputRef.current?.click()}
              className="relative h-28 w-full overflow-hidden rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground hover:bg-muted/80 transition-colors"
              aria-label="Change cover image"
            >
              {wallURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={wallURL} alt="" className="size-full object-cover" />
              ) : (
                "Click to upload cover image"
              )}
              {uploadingWall && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="size-5 animate-spin" />
                </span>
              )}
            </button>
            <input
              ref={wallInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                void handleWallSelected(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          {/* Avatar */}
          <div className="space-y-1.5">
            <Label>Group photo</Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="relative size-16 shrink-0 overflow-hidden rounded-full border bg-muted"
                aria-label="Change group photo"
              >
                {photoURL && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoURL} alt="" className="size-full object-cover" />
                )}
                {uploadingPhoto && (
                  <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                    <Loader2 className="size-5 animate-spin" />
                  </span>
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  void handlePhotoSelected(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                Change photo
              </Button>
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
