"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, MessageCircle, Tag } from "lucide-react";
import { useUserStore } from "@/lib/store/useUserStore";
import { useDirectMessage } from "@/hooks/useDirectMessage";
import { Button } from "@/components/ui/button";
import {
  getPostProduct,
  markProductSold,
  type PostProductProps,
} from "@/app/actions/posts";

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

export default function PostProductCard({
  postId,
  isPostPage = false,
}: {
  postId: string;
  isPostPage?: boolean;
}) {
  const currentUid = useUserStore(state => state.user?.uid);
  const { startDM, loading: dmLoading } = useDirectMessage();
  const [product, setProduct] = useState<PostProductProps | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingSold, setTogglingSold] = useState(false);

  useEffect(() => {
    let active = true;
    getPostProduct(postId)
      .then(result => {
        if (active) setProduct(result);
      })
      .catch(err => console.error("getPostProduct failed:", err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [postId]);

  const handleToggleSold = async () => {
    if (!product) return;
    setTogglingSold(true);
    try {
      await markProductSold(postId, !product.sold);
      setProduct({ ...product, sold: !product.sold });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update listing");
    } finally {
      setTogglingSold(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-4 flex items-center justify-center rounded-xl border p-6">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) return null;

  const isSeller = currentUid === product.sellerUid;

  return (
    <div className="mx-4 space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tag className="size-4 text-primary" />
          <span className="font-semibold">{product.name}</span>
          {product.sold && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Sold
            </span>
          )}
        </div>
        <span className="text-sm font-semibold">
          {formatPrice(product.price, product.currency)}
        </span>
      </div>

      {isPostPage && product.images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {product.images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`${product.name} photo ${i + 2}`}
              className="aspect-square w-full rounded-md object-cover"
            />
          ))}
        </div>
      )}

      {isSeller ? (
        <Button
          size="sm"
          variant="outline"
          onClick={handleToggleSold}
          disabled={togglingSold}
        >
          {togglingSold && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
          {product.sold ? "Mark as available" : "Mark as sold"}
        </Button>
      ) : (
        !product.sold && (
          <Button
            size="sm"
            onClick={() => void startDM(product.sellerUid)}
            disabled={dmLoading}
          >
            <MessageCircle className="mr-1.5 size-3.5" />
            Message seller
          </Button>
        )
      )}
    </div>
  );
}
