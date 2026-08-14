"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { MessageProps } from "@/lib/types";
import { getSmartReplySuggestions } from "@/app/actions/smartReply";

export default function SmartReplyChips({
  messages,
  onSelect,
}: {
  messages: MessageProps[];
  onSelect: (text: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const lastMessage = messages[messages.length - 1];

  useEffect(() => {
    if (!lastMessage) {
      setSuggestions([]);
      return;
    }

    let active = true;
    const recent = messages.slice(-6).map(m => ({ senderId: m.senderId, text: m.text ?? "" }));

    getSmartReplySuggestions(recent)
      .then(result => {
        if (active) setSuggestions(result);
      })
      .catch(() => {
        if (active) setSuggestions([]);
      });

    return () => {
      active = false;
    };
    // Only regenerate when the newest message actually changes, not on
    // every render of the parent's messages array reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage?.id]);

  if (suggestions.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto px-2 pb-1 scrollbar-none">
      <Sparkles className="size-3.5 shrink-0 text-muted-foreground" />
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          type="button"
          onClick={() => {
            onSelect(suggestion);
            setSuggestions([]);
          }}
          className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-accent"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
