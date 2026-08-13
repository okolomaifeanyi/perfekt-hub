import { ButtonsProps, EmojiProps } from "@/lib/types";
import Emoji from "./Emoji";
import GifPicker from "./Gif";
import Media from "./Media";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { Button } from "../ui/button";
import { CreateEventDialog } from "../CreateEventDialog";

const Buttons: React.FC<ButtonsProps> = ({
  setText,
  setMedia,
  setGifDialogOpen,
  gifDialogOpen,
  media,
  showEvent = true,
}) => {
  return (
    <div className="flex space-x-1.5 items-center">
      <Media setMedia={setMedia} media={media} />

      <Emoji
        onSelect={(emoji: EmojiProps) => {
          setText(prev => prev + emoji.native);
        }}
      />

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
