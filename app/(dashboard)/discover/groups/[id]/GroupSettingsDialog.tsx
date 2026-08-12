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
import { deleteGroup, updateGroupSettings, type GroupProps } from "@/app/actions/groups";
import { uploadToCloudinary } from "@/components/post-composer/utils";

export function GroupSettingsDialog({ group }: { group: GroupProps }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [photoURL, setPhotoURL] = useState(group.photoURL);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateGroupSettings(group.id, { name, description, photoURL });
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Group settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
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
              ref={fileInputRef}
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
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
            >
              Change photo
            </Button>
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
