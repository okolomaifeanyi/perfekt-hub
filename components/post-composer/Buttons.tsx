import { ButtonsProps, EmojiProps } from "@/lib/types";
import Emoji from "./Emoji";
import GifPicker from "./Gif";
import Media from "./Media";
import { toast } from "sonner";

const Buttons: React.FC<ButtonsProps> = ({
  setText,
  setMedia,
  setGifDialogOpen,
  gifDialogOpen,
  media,
}) => {
  return (
    <div className="flex space-x-1.5 items-center">
      <Media setMedia={setMedia} media={media} />

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
    </div>
  );
};

export default Buttons;
