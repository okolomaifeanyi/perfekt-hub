"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Globe, ImagePlus, Loader2, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createGroupPost, type GroupPostProps, type GroupPostVisibility } from "@/app/actions/groups";
import { uploadToCloudinary } from "@/components/post-composer/utils";
import { userAltImageUrl } from "@/components/UserAltImageUrl";

type MediaItem = { url: string; type: "image" | "video" };

export function GroupPostComposer({
  groupId,
  myPhotoURL,
  myName,
  onPosted,
}: {
  groupId: string;
  myPhotoURL?: string | null;
  myName?: string;
  onPosted: (post: GroupPostProps) => void;
}) {
  const [text, setText] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [visibility, setVisibility] = useState<GroupPostVisibility>("public");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleMedia = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    try {
      const uploads = await Promise.all(
        Array.from(files).map(async file => {
          const res = await uploadToCloudinary(file);
          const type: "image" | "video" = file.type.startsWith("video") ? "video" : "image";
          return { url: res.secure_url as string, type };
        })
      );
      setMedia(prev => [...prev, ...uploads]);
    } catch {
      toast.error("Failed to upload media");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() && media.length === 0) return;
    setSubmitting(true);
    try {
      const post = await createGroupPost({ groupId, text, media, visibility });
      onPosted(post);
      setText("");
      setMedia([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex gap-3">
        <Avatar className="size-9 shrink-0">
          <AvatarImage
            src={myPhotoURL || userAltImageUrl({ name: myName || "" })}
            alt=""
          />
          <AvatarFallback>{(myName || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <Textarea
          placeholder="Share something with the group..."
          className="min-h-[64px] resize-none text-sm"
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={submitting}
        />
      </div>

      {media.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {media.map((m, i) => (
            <div key={i} className="relative size-20 overflow-hidden rounded-md border">
              {m.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="size-full object-cover" />
              ) : (
                <video src={m.url} className="size-full object-cover" muted />
              )}
              <button
                type="button"
                onClick={() => setMedia(prev => prev.filter((_, j) => j !== i))}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || submitting}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={e => {
              void handleMedia(e.target.files);
              e.target.value = "";
            }}
          />

          <Select
            value={visibility}
            onValueChange={v => setVisibility(v as GroupPostVisibility)}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">
                <span className="flex items-center gap-1.5">
                  <Globe className="size-3.5" />
                  Public
                </span>
              </SelectItem>
              <SelectItem value="private">
                <span className="flex items-center gap-1.5">
                  <Lock className="size-3.5" />
                  Members only
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || uploading || (!text.trim() && media.length === 0)}
        >
          {submitting ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
          Post
        </Button>
      </div>
    </div>
  );
}
