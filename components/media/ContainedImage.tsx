"use client";

import Image from "next/image";
import * as React from "react";
import { cn } from "@/lib/utils";
import {
  fallbackColorFromSrc,
  sampleAverageColorFromImageElement,
} from "@/lib/image-colors.mjs";
import { DataSaverPlaceholder, useDataSaverGate } from "./DataSaverGate";

type ContainedImageProps = {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  unoptimized?: boolean;
  loading?: "eager" | "lazy";
  className?: string;
  imageClassName?: string;
  // Fires once the real image has loaded, with its natural pixel size —
  // lets a caller that doesn't know the image's aspect ratio ahead of time
  // (nothing here is stored server-side) size its own wrapper to match,
  // instead of leaving it boxed into a fixed ratio that doesn't fit.
  onNaturalSize?: (size: { width: number; height: number }) => void;
};

export function ContainedImage({
  src,
  alt,
  sizes = "100vw",
  priority = false,
  unoptimized = false,
  loading,
  className,
  imageClassName,
  onNaturalSize,
}: ContainedImageProps) {
  const [backgroundColor, setBackgroundColor] = React.useState(() =>
    fallbackColorFromSrc(src)
  );
  const { isGated, reveal } = useDataSaverGate();

  React.useEffect(() => {
    setBackgroundColor(fallbackColorFromSrc(src));
  }, [src]);

  const handleLoad = React.useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      setBackgroundColor(
        sampleAverageColorFromImageElement(event.currentTarget)
      );
      const img = event.currentTarget;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        onNaturalSize?.({ width: img.naturalWidth, height: img.naturalHeight });
      }
    },
    [onNaturalSize]
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted/20 transition-colors duration-300",
        className
      )}
      style={{ backgroundColor }}
    >
      {isGated ? (
        <DataSaverPlaceholder
          backgroundColor={backgroundColor}
          kind="image"
          onReveal={reveal}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          loading={loading}
          crossOrigin="anonymous"
          unoptimized={unoptimized}
          onLoad={handleLoad}
          className={cn("object-contain", imageClassName)}
        />
      )}
    </div>
  );
}
