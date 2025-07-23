"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ReactNode, useEffect, useRef, useState } from "react";

type TextProps = {
  text: string;
};

function parseText(text: string): (string | ReactNode)[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      return (
        <Link
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline break-all"
        >
          {part}
        </Link>
      );
    }

    return part.split("\n").reduce<ReactNode[]>((acc, line, index) => {
      if (index > 0) acc.push(<br key={`br-${i}-${index}`} />);
      acc.push(<span key={`line-${i}-${index}`}>{line}</span>);
      return acc;
    }, []);
  });
}

export default function Text({ text }: TextProps) {
  const [lines, setLines] = useState(3);
  const [showSeeMore, setShowSeeMore] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const maxLines = 100;

  useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        const isOverflowing =
          textRef.current.scrollHeight > textRef.current.clientHeight;
        setShowSeeMore(isOverflowing);
      }
    };

    checkOverflow();
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
        {parseText(text)}
      </div>

      {showSeeMore && lines < maxLines && (
        <Button
          className="p-0 mt-1"
          variant="link"
          onClick={() => setLines(prev => prev + 3)}
        >
          See more
        </Button>
      )}
    </div>
  );
}
