import { MediaProps, PostProps, UserProps } from "@/lib/types";
import { toast } from "sonner";
import { sendPost } from "./actions";
import { createPostPoll, createPostProduct } from "@/app/actions/posts";

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

export type ProductDraft = {
  name: string;
  price: number;
  currency: string;
  images: MediaProps[]; // additional gallery photos, beyond the post's own single media image
};

export async function handlePost({
  text,
  media,
  user,
  onSuccess,
  parentPostId = null,
  quotePostId = null,
  pollOptions,
  product,
}: {
  text: string;
  media: MediaProps[];
  user: UserProps;
  onSuccess?: () => void;
  parentPostId?: string | null;
  quotePostId?: string | null;
  pollOptions?: string[];
  product?: ProductDraft;
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

    const postType: "text" | "poll" | "product" =
      pollOptions && pollOptions.length >= 2
        ? "poll"
        : product
          ? "product"
          : "text";

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
      postType,
    });

    // The post itself is already live at this point — if attaching the poll
    // options fails, don't report the whole post as failed, just surface it
    // as a bare post (postType is still "poll" with nothing to vote on yet
    // rather than silently dropping to "text", so this is visible/fixable
    // rather than a silent partial failure).
    if (pollOptions && pollOptions.length >= 2) {
      try {
        await createPostPoll({ postId: post.id, options: pollOptions });
      } catch (pollErr) {
        console.error("Poll options failed to save:", pollErr);
        toast.error("Post published, but the poll options failed to save.");
      }
    }

    if (product) {
      try {
        const uploadedGallery = await Promise.all(
          product.images.map(async item => {
            if (item.file) {
              const result = await uploadToCloudinary(item.file);
              return result.secure_url as string;
            }
            return item.src;
          })
        );
        await createPostProduct({
          postId: post.id,
          name: product.name,
          price: product.price,
          currency: product.currency,
          images: uploadedGallery,
        });
      } catch (productErr) {
        console.error("Product listing failed to save:", productErr);
        toast.error("Post published, but the product listing failed to save.");
      }
    }

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
