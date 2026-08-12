"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileIcon, FileText, Film, ImageIcon, Loader2, Pin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteGroupFile,
  listGroupFiles,
  pinGroupFile,
  uploadGroupFile,
  type GroupFileProps,
  type GroupFileType,
} from "@/app/actions/groups";
import { uploadToCloudinary } from "@/components/post-composer/utils";

function fileTypeFromMime(mime: string): GroupFileType {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "file";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FileIcon2({ type }: { type: GroupFileType }) {
  if (type === "image") return <ImageIcon className="size-4 text-blue-500" />;
  if (type === "video") return <Film className="size-4 text-purple-500" />;
  if (type === "pdf") return <FileText className="size-4 text-red-500" />;
  return <FileIcon className="size-4 text-muted-foreground" />;
}

function GroupFileRow({
  file,
  isAdmin,
  currentUid,
  onPin,
  onDelete,
}: {
  file: GroupFileProps;
  isAdmin: boolean;
  currentUid?: string;
  onPin: (id: string, pin: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const isOwner = file.uploaderUid === currentUid;
  const [pinBusy, setPinBusy] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  const handlePin = async () => {
    setPinBusy(true);
    try {
      await pinGroupFile(file.id, !file.isPinned);
      onPin(file.id, !file.isPinned);
      toast.success(file.isPinned ? "File unpinned" : "File pinned");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPinBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this file?")) return;
    setDelBusy(true);
    try {
      await deleteGroupFile(file.id);
      onDelete(file.id);
      toast.success("File deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setDelBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
      <FileIcon2 type={file.fileType} />
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
          {formatBytes(file.size)}
          {file.uploaderUsername && ` · ${file.uploaderUsername}`}
          {file.isPinned && " · 📌 Pinned"}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handlePin}
            disabled={pinBusy}
            title={file.isPinned ? "Unpin" : "Pin"}
          >
            {pinBusy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Pin className={`size-3.5 ${file.isPinned ? "fill-current" : ""}`} />
            )}
          </Button>
        )}
        {(isAdmin || isOwner) && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={delBusy}
          >
            {delBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          </Button>
        )}
      </div>
    </div>
  );
}

export function GroupFiles({
  groupId,
  initialFiles,
  isAdmin,
  currentUid,
  isMember,
}: {
  groupId: string;
  initialFiles: GroupFileProps[];
  isAdmin: boolean;
  currentUid?: string;
  isMember: boolean;
}) {
  const [files, setFiles] = useState<GroupFileProps[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const images = files.filter(f => f.fileType === "image");
  const videos = files.filter(f => f.fileType === "video");
  const pdfs = files.filter(f => f.fileType === "pdf");

  const handleUpload = async (selected: FileList | null) => {
    if (!selected) return;
    setUploading(true);
    try {
      const uploads = await Promise.all(
        Array.from(selected).map(async file => {
          const res = await uploadToCloudinary(file);
          const fileType = fileTypeFromMime(file.type);
          const uploaded = await uploadGroupFile({
            groupId,
            name: file.name,
            url: res.secure_url as string,
            fileType,
            size: file.size,
          });
          return uploaded;
        })
      );
      setFiles(prev => [...uploads, ...prev]);
      toast.success(`${uploads.length} file${uploads.length > 1 ? "s" : ""} uploaded`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handlePin = (id: string, pin: boolean) => {
    setFiles(prev => {
      const next = prev.map(f => (f.id === id ? { ...f, isPinned: pin } : f));
      return [...next.filter(f => f.isPinned), ...next.filter(f => !f.isPinned)];
    });
  };

  const handleDelete = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const renderList = (items: GroupFileProps[]) => {
    if (items.length === 0) {
      return <p className="py-6 text-center text-sm text-muted-foreground">No files yet</p>;
    }
    return (
      <div className="space-y-2">
        {items.map(f => (
          <GroupFileRow
            key={f.id}
            file={f}
            isAdmin={isAdmin}
            currentUid={currentUid}
            onPin={handlePin}
            onDelete={handleDelete}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Files</h2>
        {isMember && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Plus className="mr-1.5 size-3.5" />
              )}
              Upload
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*,application/pdf"
              multiple
              className="hidden"
              onChange={e => {
                void handleUpload(e.target.files);
                e.target.value = "";
              }}
            />
          </>
        )}
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
