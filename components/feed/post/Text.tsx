"use client";
import { P } from "@/components/Typography";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function Text({ text }: { text: string }) {
  const [lines, setLines] = useState(3);
  const [showSeeMore, setShowSeeMore] = useState(true);
  const maxLines = 100;

  useEffect(() => {
    // Check if all text is visible when the component mounts or lines change
    const element = document.querySelector(
      `[style*="webkit-line-clamp: ${lines}"]`
    );
    if (element) {
      const isTruncated = element.scrollHeight > element.clientHeight;
      setShowSeeMore(isTruncated);
    } else {
      // If the element isn't found immediately, assume it might be truncated initially
      setShowSeeMore(true);
    }
  }, [lines, text]);

  return (
    <div>
      <P
        className="overflow-hidden transition-all duration-300"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: lines,
          WebkitBoxOrient: "vertical",
        }}
      >
        {text}
      </P>

      {showSeeMore && lines < maxLines && (
        <Button
          className="p-0"
          variant="link"
          onClick={() => setLines(prev => prev + 3)}
        >
          See more
        </Button>
      )}
    </div>
  );
}
