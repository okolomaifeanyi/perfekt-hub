"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SortToggle, type ListSortMode } from "@/components/discover/SortToggle";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { listProductsPage, type PostProductProps } from "@/app/actions/posts";

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

function ProductCardSkeleton() {
  return (
    <div className="space-y-2 overflow-hidden rounded-xl border">
      <div className="aspect-square w-full animate-pulse bg-muted" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: PostProductProps }) {
  const href = product.sellerUsername
    ? `/${product.sellerUsername}/${product.postId}`
    : "/discover/products";

  return (
    <Link href={href} className="block overflow-hidden rounded-xl border transition hover:bg-accent/40">
      <div className="flex aspect-square w-full items-center justify-center bg-muted">
        {product.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.thumbnailUrl} alt={product.name} className="size-full object-cover" />
        ) : (
          <Tag className="size-8 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-0.5 p-3">
        <p className="truncate text-sm font-medium">{product.name}</p>
        <p className="text-sm font-semibold text-primary">
          {formatPrice(product.price, product.currency)}
        </p>
      </div>
    </Link>
  );
}

export function ProductsListClient() {
  const [sortMode, setSortMode] = useState<ListSortMode>("time");

  const { items, loading, loadingMore, hasMore, sentinelRef } = useInfiniteList<PostProductProps>({
    sortMode,
    pageSize: 20,
    fetchPage: ({ offset, sortMode: mode, limit }) =>
      listProductsPage({ offset, sortMode: mode as ListSortMode, limit }),
  });

  return (
    <div className="space-y-4">
      <SortToggle value={sortMode} onChange={setSortMode} engagementLabel="Lowest price" />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="py-8">
          <CardContent className="text-center text-sm text-muted-foreground">
            No listings yet — sell something from the composer.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />
      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {!hasMore && items.length > 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">You&apos;ve reached the end.</p>
      )}
    </div>
  );
}
