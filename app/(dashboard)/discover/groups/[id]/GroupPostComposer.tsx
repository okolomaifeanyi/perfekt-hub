"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { BarChart3, Globe, ImagePlus, Loader2, Lock, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createGroupPost, type GroupPostProps, type GroupPostVisibility } from "@/app/actions/groups";
import { createPoll, type PollProps, type PollVisibility } from "@/app/actions/polls";
import { uploadToCloudinary } from "@/components/post-composer/utils";
import { userAltImageUrl } from "@/components/UserAltImageUrl";

type MediaItem = { url: string; type: "image" | "video" };

export function GroupPostComposer({
  groupId,
  myPhotoURL,
  myName,
  defaultVisibility = "public",
  onPosted,
  onPollCreated,
}: {
  groupId: string;
  myPhotoURL?: string | null;
  myName?: string;
  defaultVisibility?: GroupPostVisibility;
  onPosted: (post: GroupPostProps) => void;
  onPollCreated?: (poll: PollProps) => void;
}) {
  // Post state
  const [text, setText] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [visibility, setVisibility] = useState<GroupPostVisibility>(defaultVisibility);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Poll state
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollAnonymous, setPollAnonymous] = useState(false);
  const [pollVisibility, setPollVisibility] = useState<PollVisibility>(defaultVisibility as PollVisibility);
  const [creatingPoll, setCreatingPoll] = useState(false);

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

  const handleCreatePoll = async () => {
    const options = pollOptions.map(o => o.trim()).filter(Boolean);
    if (!pollQuestion.trim()) return toast.error("Poll question is required");
    if (options.length < 2) return toast.error("Add at least 2 options");
    setCreatingPoll(true);
    try {
      const poll = await createPoll({
        groupId,
        question: pollQuestion.trim(),
        options,
        anonymous: pollAnonymous,
        visibility: pollVisibility,
      });
      toast.success("Poll created");
      onPollCreated?.(poll);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setPollAnonymous(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create poll");
    } finally {
      setCreatingPoll(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <Tabs defaultValue="post">
        <TabsList className="h-8">
          <TabsTrigger value="post" className="text-xs px-3">Post</TabsTrigger>
          <TabsTrigger value="poll" className="text-xs px-3">
            <BarChart3 className="mr-1 size-3.5" />
            Poll
          </TabsTrigger>
        </TabsList>

        {/* ── Post ─────────────────────────────────────────── */}
        <TabsContent value="post" className="mt-3 space-y-3">
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
        </TabsContent>

        {/* ── Poll ─────────────────────────────────────────── */}
        <TabsContent value="poll" className="mt-3 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Question</Label>
            <Input
              value={pollQuestion}
              onChange={e => setPollQuestion(e.target.value)}
              placeholder="What should we vote on?"
              maxLength={200}
              disabled={creatingPoll}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Options</Label>
            {pollOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={e =>
                    setPollOptions(prev =>
                      prev.map((o, i) => (i === index ? e.target.value : o))
                    )
                  }
                  placeholder={`Option ${index + 1}`}
                  maxLength={100}
                  disabled={creatingPoll}
                />
                {pollOptions.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => setPollOptions(prev => prev.filter((_, i) => i !== index))}
                    disabled={creatingPoll}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            {pollOptions.length < 8 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setPollOptions(prev => [...prev, ""])}
                disabled={creatingPoll}
              >
                <Plus className="mr-1 size-3.5" />
                Add option
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={pollAnonymous}
                onChange={e => setPollAnonymous(e.target.checked)}
                className="size-4"
                disabled={creatingPoll}
              />
              Anonymous voting
            </label>

            <Select
              value={pollVisibility}
              onValueChange={v => setPollVisibility(v as PollVisibility)}
            >
              <SelectTrigger className="h-8 w-[130px] text-xs">
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

            <Button
              size="sm"
              className="ml-auto"
              onClick={handleCreatePoll}
              disabled={creatingPoll || !pollQuestion.trim() || pollOptions.filter(Boolean).length < 2}
            >
              {creatingPoll ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
              Create poll
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
