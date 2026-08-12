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
    },
    []
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
