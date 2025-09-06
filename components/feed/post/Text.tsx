"use client";

import { Button } from "@/components/ui/button";
import { ReactNode, useEffect, useRef, useState } from "react";

type TextProps = {
  text: string;
};

function parseText(text: string): ReactNode[] {
  // A robust regex to find various URL formats, including those without "http" or "www".
  const urlRegex =
    /((?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*))/gi;

  // Replace any found URLs with an empty string and trim surrounding whitespace.
  const textWithoutUrls = text.replace(urlRegex, "").trim();

  // If the text is empty after removing links, there's nothing to render.
  if (!textWithoutUrls) {
    return [];
  }

  // Split the cleaned text by newlines and render each line, separated by <br> tags.
  return textWithoutUrls.split("\n").reduce<ReactNode[]>((acc, line, index) => {
    if (index > 0) {
      acc.push(<br key={`br-${index}`} />);
    }
    acc.push(<span key={`line-${index}`}>{line}</span>);
    return acc;
  }, []);
}

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

  const content = parseText(text);

  // If the text only contained a URL (or was empty), render nothing.
  if (content.length === 0) {
    return null;
  }

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
        {content}
      </div>

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
