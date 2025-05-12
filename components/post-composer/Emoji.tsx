"use client";

import { loadEmojiData } from "@/lib/utils";
import Picker from "@emoji-mart/react";
import { Smile } from "lucide-react";
import { Button } from "../ui/button";
import { Suspense, use } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { EmojiProps } from "@/lib/types";

const Emoji = ({ onSelect }: { onSelect: (emoji: EmojiProps) => void }) => {
  const data = use(loadEmojiData());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" title="Add Emoji">
          <Smile />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto">
        <Suspense fallback={<p>Loading emojis...</p>}>
          <Picker data={data} theme="auto" onEmojiSelect={onSelect} autoFocus />
        </Suspense>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default Emoji;
