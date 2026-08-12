"use client";

import Link from "next/link";

import { tokenizeRichText } from "@/lib/rich-text.mjs";
import { cn } from "@/lib/utils";

type RichTextProps = {
  text: string;
  className?: string;
  mentionClassName?: string;
  urlClassName?: string;
  renderUrls?: boolean;
};

export default function RichText({
  text,
  className,
  mentionClassName,
  urlClassName,
  renderUrls = true,
}: RichTextProps) {
  const lines = tokenizeRichText(text);

  if (lines.length === 0 || lines.every(line => line.length === 0)) {
    return null;
  }

  return (
    <span className={cn("break-words", className)}>
      {lines.map((line, lineIndex) => (
        <span key={`line-${lineIndex}`}>
          {line.map((token, tokenIndex) => {
            if (token.type === "mention") {
              return (
                <Link
                  key={`${lineIndex}-${tokenIndex}`}
                  href={`/${token.value}`}
                  onClick={event => event.stopPropagation()}
                  className={cn(
                    "font-medium text-primary hover:underline",
                    mentionClassName
                  )}
                >
                  @{token.value}
                </Link>
              );
            }

            if (token.type === "url") {
              if (!renderUrls) return null;

              return (
                <a
                  key={`${lineIndex}-${tokenIndex}`}
                  href={token.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={event => event.stopPropagation()}
                  className={cn("underline underline-offset-2", urlClassName)}
                >
                  {token.raw}
                </a>
              );
            }

            return (
              <span key={`${lineIndex}-${tokenIndex}`}>{token.value}</span>
            );
          })}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      ))}
    </span>
  );
}
