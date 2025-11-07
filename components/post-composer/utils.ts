import { MediaProps, PostProps, UserProps } from "@/lib/types";
import { toast } from "sonner";
import { sendPost } from "./actions";

export const uploadToCloudinary = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.result;
};

export async function handlePost({
  text,
  media,
  user,
  onSuccess,
  parentPostId = null,
  quotePostId = null,
}: {
  text: string;
  media: MediaProps[];
  user: UserProps;
  onSuccess?: () => void;
  parentPostId?: string | null;
  quotePostId?: string | null;
}): Promise<PostProps | null> {
  try {
    const uploadedMedia: MediaProps[] = await Promise.all(
      media.map(async item => {
        if (item.file) {
          const result = await uploadToCloudinary(item.file);
          return { src: result.secure_url, type: item.type };
        }
        return item;
      })
    );

    const post = await sendPost({
      text,
      media: uploadedMedia,
      user: {
        uid: user.uid,
        username: user.username,
        photoURL: user.photoURL || "",
        fullName: user.fullName || "",
      },
      parentPostId,
      quotePostId,
    });

    toast.success("Post published");
    onSuccess?.();
    return post; // ← now returns PostProps
  } catch (err: unknown) {
    console.error("Post failed", err);
    toast.error("Post failed", {
      description: err instanceof Error ? err.message : "Something went wrong",
    });
    return null;
  }
}

// Safe hostname extraction function
export function safeGetHostname(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}
