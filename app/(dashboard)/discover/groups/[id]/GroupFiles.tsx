"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileIcon, FileText, Film, ImageIcon, Loader2, Pin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  pinPostAttachment,
  type GroupFileProps,
  type GroupFileType,
  type GroupPostProps,
} from "@/app/actions/groups";
import { useGroupStore } from "@/lib/store/useGroupStore";

function fileTypeFromMediaType(type: string): GroupFileType {
  if (type === "image") return "image";
  if (type === "video") return "video";
  if (type === "pdf") return "pdf";
  return "file";
}

function FileTypeIcon({ type }: { type: GroupFileType }) {
  if (type === "image") return <ImageIcon className="size-4 text-blue-500" />;
  if (type === "video") return <Film className="size-4 text-purple-500" />;
  if (type === "pdf") return <FileText className="size-4 text-red-500" />;
  return <FileIcon className="size-4 text-muted-foreground" />;
}

type DerivedFile = {
  url: string;
  name: string;
  fileType: GroupFileType;
  uploaderUid: string;
  uploaderUsername?: string;
  isPinned: boolean;
};

function GroupFileRow({
  file,
  isAdmin,
  onPin,
}: {
  file: DerivedFile;
  isAdmin: boolean;
  onPin: (file: DerivedFile) => void;
}) {
  const [pinBusy, setPinBusy] = useState(false);

  const handlePin = async () => {
    setPinBusy(true);
    try {
      await onPin(file);
    } finally {
      setPinBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
      <FileTypeIcon type={file.fileType} />
      <div className="min-w-0 flex-1">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-sm font-medium hover:underline block"
        >
          {file.name}
        </a>
        <p className="text-xs text-muted-foreground">
          {file.uploaderUsername && `@${file.uploaderUsername}`}
          {file.isPinned && " · 📌 Pinned"}
        </p>
      </div>
      {isAdmin && !file.isPinned && (
        <button
          type="button"
          onClick={handlePin}
          disabled={pinBusy}
          title="Pin to top"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {pinBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Pin className="size-3.5" />}
        </button>
      )}
    </div>
  );
}

export function GroupFiles({
  posts,
  pinnedFiles,
  isAdmin,
}: {
  groupId: string;
  posts: GroupPostProps[];
  pinnedFiles: GroupFileProps[];
  isAdmin: boolean;
  currentUid?: string;
  isMember: boolean;
}) {
  const [localPinned, setLocalPinned] = useState<Set<string>>(
    new Set(pinnedFiles.map(f => f.url))
  );

  const files = useMemo<DerivedFile[]>(() => {
    const seen = new Set<string>();
    const derived: DerivedFile[] = [];

    for (const post of posts) {
      for (const media of post.media ?? []) {
        if (!media.url || seen.has(media.url)) continue;
        seen.add(media.url);
        derived.push({
          url: media.url,
          name: media.name || `${post.authorUsername || "attachment"}-${derived.length + 1}`,
          fileType: fileTypeFromMediaType(media.type),
          uploaderUid: post.userId,
          uploaderUsername: post.authorUsername,
          isPinned: localPinned.has(media.url),
        });
      }
    }

    // Pinned first, matching the existing "pinned files show first" pattern.
    return derived.sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
  }, [posts, localPinned]);

  const images = files.filter(f => f.fileType === "image");
  const videos = files.filter(f => f.fileType === "video");
  const pdfs = files.filter(f => f.fileType === "pdf");

  const handlePin = async (file: DerivedFile) => {
    const groupId = posts[0]?.groupId ?? "";
    try {
      await pinPostAttachment({
        groupId,
        url: file.url,
        name: file.name,
        fileType: file.fileType,
        uploaderUid: file.uploaderUid,
      });
      setLocalPinned(prev => new Set(prev).add(file.url));
      // Keep the Aside's files section (above members) in sync — it reads
      // from the same store GroupDetailClient seeds on mount.
      const newPinned: GroupFileProps = {
        id: file.url,
        groupId,
        uploaderUid: file.uploaderUid,
        name: file.name,
        url: file.url,
        fileType: file.fileType,
        size: 0,
        isPinned: true,
        createdAt: new Date().toISOString(),
        uploaderUsername: file.uploaderUsername,
      };
      useGroupStore.getState().updateFiles([
        ...useGroupStore.getState().files.filter(f => f.url !== file.url),
        newPinned,
      ]);
      toast.success("File pinned");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to pin file");
    }
  };

  const renderList = (items: DerivedFile[]) => {
    if (items.length === 0) {
      return <p className="py-6 text-center text-sm text-muted-foreground">No files yet</p>;
    }
    return (
      <div className="space-y-2">
        {items.map(f => (
          <GroupFileRow key={f.url} file={f} isAdmin={isAdmin} onPin={handlePin} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Files</h2>
        <p className="text-xs text-muted-foreground">
          Images, videos, and PDFs shared in group posts show up here automatically.
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="h-8 text-xs">
          <TabsTrigger value="all" className="text-xs">All ({files.length})</TabsTrigger>
          <TabsTrigger value="images" className="text-xs">Images ({images.length})</TabsTrigger>
          <TabsTrigger value="videos" className="text-xs">Videos ({videos.length})</TabsTrigger>
          <TabsTrigger value="pdfs" className="text-xs">PDFs ({pdfs.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-3">{renderList(files)}</TabsContent>
        <TabsContent value="images" className="mt-3">{renderList(images)}</TabsContent>
        <TabsContent value="videos" className="mt-3">{renderList(videos)}</TabsContent>
        <TabsContent value="pdfs" className="mt-3">{renderList(pdfs)}</TabsContent>
      </Tabs>
    </div>
  );
}
