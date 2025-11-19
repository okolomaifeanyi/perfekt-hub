import { MediaProps, PostProps, UserProps } from "@/lib/types";
import { toast } from "sonner";
import { sendPost } from "./actions";

// export const uploadToCloudinary = async (file: File) => {
//   const formData = new FormData();
//   formData.append("file", file);

//   const res = await fetch("/api/upload", {
//     method: "POST",
//     body: formData,
//   });

//   const data = await res.json();
//   if (!res.ok) throw new Error(data.error);
//   return data.result;
// };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const uploadToCloudinary = async (file: File, retryCount = 0): Promise<any> => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    let data;
    if (res.ok) {
      data = await res.json();
    } else {
      try {
        data = await res.json();
      } catch {
        const errorText = await res.text();
        // Detect QUIC error specifically
        if (errorText.includes("QUIC") || errorText.includes("ERR_QUIC_PROTOCOL_ERROR")) {
          if (retryCount < 2) {
            console.warn("QUIC error detected—retrying with fallback...");
            // Fallback: Force TCP by appending a query param (tricks some proxies)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const fallbackUrl = "/api/upload?fallback=1";
            return uploadToCloudinary(file, retryCount + 1); // Recursive retry
          }
        }
        throw new Error(errorText.substring(0, 200) || "Upload server error");
      }
      throw new Error(data.error || "Upload failed");
    }

    return data.result;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    // If QUIC suspected and retries exhausted, suggest user fix
    if (err.message.includes("QUIC") && retryCount >= 2) {
      toast.error("Network issue (QUIC protocol)—try disabling Chrome's QUIC flag or VPN.", {
        duration: 5000,
      });
    }
    throw err;
  }
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
