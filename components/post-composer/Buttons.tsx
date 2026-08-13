import { ButtonsProps, EmojiProps } from "@/lib/types";
import Emoji from "./Emoji";
import GifPicker from "./Gif";
import Media from "./Media";
import { toast } from "sonner";
import { CalendarPlus, BarChart3, Tag } from "lucide-react";
import { Button } from "../ui/button";
import { CreateEventDialog } from "../CreateEventDialog";
import { cn } from "@/lib/utils";

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
  return (
    <div className="flex space-x-1.5 items-center">
      <Media setMedia={setMedia} media={media} disabled={pollMode} />

      <Emoji
        onSelect={(emoji: EmojiProps) => {
          setText(prev => prev + emoji.native);
        }}
      />

      {showPoll && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "size-8 text-muted-foreground hover:text-foreground",
            pollMode && "bg-accent text-foreground"
          )}
          title={pollMode ? "Remove poll" : "Create a poll"}
          onClick={onTogglePoll}
        >
          <BarChart3 className="size-4.5" />
        </Button>
      )}

      {showSell && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "size-8 text-muted-foreground hover:text-foreground",
            sellMode && "bg-accent text-foreground"
          )}
          title={sellMode ? "Remove product listing" : "Sell a product"}
          onClick={onToggleSell}
        >
          <Tag className="size-4.5" />
        </Button>
      )}

      {showEvent && (
        <CreateEventDialog
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              title="Create an event"
            >
              <CalendarPlus className="size-4.5" />
            </Button>
          }
        />
      )}

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
    </div>
  );
};

export default Buttons;
