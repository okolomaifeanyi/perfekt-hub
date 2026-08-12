"use client";

import RichText from "@/components/RichText";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

type TextProps = {
  text: string;
};

export default function Text({ text }: TextProps) {
  const [lines, setLines] = useState(3);
  const [showSeeMore, setShowSeeMore] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const maxLines = 100;

  useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        // Check if the content's actual scroll height is greater than its visible height.
        const isOverflowing =
          textRef.current.scrollHeight > textRef.current.clientHeight;
        setShowSeeMore(isOverflowing);
      }
    };

    // Use a timeout to ensure the check runs after the DOM has fully updated.
    const timeoutId = setTimeout(checkOverflow, 50);
    window.addEventListener("resize", checkOverflow);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [lines, text]);

  return (
    <div>
      <div
        ref={textRef}
        className="overflow-hidden transition-all duration-300 text-justify break-words"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: lines,
          WebkitBoxOrient: "vertical",
        }}
      >
        <RichText text={text} renderUrls={false} />
      </div>

      {showSeeMore && lines < maxLines && (
        <Button
          className="p-0"
          variant="link"
          onClick={event => {
            event.stopPropagation();
            setLines(prev => prev + 3);
          }}
        >
          See more
        </Button>
      )}
    </div>
  );
}
