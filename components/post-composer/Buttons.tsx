import { useState } from "react";
import { ButtonsProps, EmojiProps } from "@/lib/types";
import Emoji from "./Emoji";
import GifPicker from "./Gif";
import Media from "./Media";
import { toast } from "sonner";
import { CalendarPlus, BarChart3, Tag, Plus, Check } from "lucide-react";
import { Button } from "../ui/button";
import { CreateEventDialog } from "../CreateEventDialog";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

// Poll, sell, and event used to each get their own icon-only button here,
// which meant six icon buttons competing for one row (see the scroll
// workaround this used to need in PostComposer). Icon-only buttons also
// have no way to explain themselves on a touch device — `title` tooltips
// never appear without a mouse hovering. Folding the three less-frequent,
// least-guessable actions into one labeled "Add to post" menu leaves Media,
// Emoji, and GIF (the three anyone recognizes on sight from every other
// app) as the only bare icons, and gives the rest an actual name.
const Buttons: React.FC<ButtonsProps> = ({
  setText,
  setMedia,
  setGifDialogOpen,
  gifDialogOpen,
  media,
  showEvent = true,
  showPoll = true,
  pollMode = false,
  onTogglePoll,
  showSell = true,
  sellMode = false,
  onToggleSell,
}) => {
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const hasMoreMenu = showPoll || showSell || showEvent;

  return (
    <div className="flex space-x-1.5 items-center">
      <Media setMedia={setMedia} media={media} disabled={pollMode} />

      <Emoji
        onSelect={(emoji: EmojiProps) => {
          setText(prev => prev + emoji.native);
        }}
      />

      <GifPicker
        onSelect={(gif, e) => {
          e.preventDefault();

          if (media.length > 4) {
            return toast("Upload failed", {
              description:
                "You can upload up to 4 media files in total — videos, images, or GIFs combined.",
            });
          }

          setMedia(prev => [
            ...prev,
            { src: gif.images.preview_gif.url, type: "image" },
          ]);

          setGifDialogOpen(false);
        }}
        open={gifDialogOpen}
        setOpen={setGifDialogOpen}
      />

      {hasMoreMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1 px-2 text-muted-foreground hover:text-foreground",
                (pollMode || sellMode) && "bg-accent text-foreground"
              )}
              aria-label="Add a poll, product, or event to this post"
            >
              <Plus className="size-4" />
              <span className="text-xs">Add to post</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {showPoll && (
              <DropdownMenuItem onSelect={() => onTogglePoll?.()} className="gap-2">
                <BarChart3 className="size-4 text-muted-foreground" />
                <span className="flex-1">{pollMode ? "Remove poll" : "Add a poll"}</span>
                {pollMode && <Check className="size-4" />}
              </DropdownMenuItem>
            )}
            {showSell && (
              <DropdownMenuItem onSelect={() => onToggleSell?.()} className="gap-2">
                <Tag className="size-4 text-muted-foreground" />
                <span className="flex-1">{sellMode ? "Remove product listing" : "Sell a product"}</span>
                {sellMode && <Check className="size-4" />}
              </DropdownMenuItem>
            )}
            {showEvent && (
              <DropdownMenuItem
                onSelect={() => setEventDialogOpen(true)}
                className="gap-2"
              >
                <CalendarPlus className="size-4 text-muted-foreground" />
                Create an event
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {showEvent && (
        <CreateEventDialog open={eventDialogOpen} onOpenChange={setEventDialogOpen} />
      )}
    </div>
  );
};

export default Buttons;
