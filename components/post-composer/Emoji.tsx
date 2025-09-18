"use client";

import { Suspense, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { Button } from "../ui/button";
import { FaceSmileIcon } from "@heroicons/react/24/solid";

const Emoji = ({ onSelect }: { onSelect: (emoji: { native: string }) => void }) => {
  const [open, setOpen] = useState(false);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onSelect({ native: emojiData.emoji });
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="secondary" title="Add Emoji">
          <FaceSmileIcon className="size-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto p-0 bg-transparent shadow-none border-none">
        <Suspense fallback={<p>Loading emojis...</p>}>
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            autoFocusSearch
            lazyLoadEmojis
            theme={Theme.AUTO}
          />
        </Suspense>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default Emoji;
