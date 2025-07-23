import { MediaProps } from "@/lib/types";
import { UserProps } from "@/lib/types";
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
}: {
  text: string;
  media: MediaProps[];
  user: UserProps;
  onSuccess?: () => void;
  parentPostId?: string | null;
}) {
  try {
    const uploadedMedia: MediaProps[] = [];

    for (const item of media) {
      if (item.file) {
        const result = await uploadToCloudinary(item.file);
        uploadedMedia.push({
          src: result.secure_url,
          type: item.type,
        });
      } else {
        // Use existing URL (likely GIF)
        uploadedMedia.push(item);
      }
    }

    const postId = await sendPost({
      text,
      media: uploadedMedia,
      user,
      parentPostId,
    });

    toast.success("Post published");
    onSuccess?.();
    return postId;
  } catch (err: unknown) {
    console.error("Post failed", err);
    toast.error("Post failed", {
      description: err instanceof Error ? err.message : "Something went wrong",
    });
  }
}
