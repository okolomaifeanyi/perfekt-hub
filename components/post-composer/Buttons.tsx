import { ButtonsProps, EmojiProps } from "@/lib/types";
import Emoji from "./Emoji";
import GifPicker from "./Gif";
import Media from "./Media";

const Buttons: React.FC<ButtonsProps> = ({
  setText,
  setMedia,
  setGifDialogOpen,
  gifDialogOpen,
}) => {
  return (
    <div className="flex space-x-1.5 items-center">
      <Media setMedia={setMedia} />

      <Emoji
        onSelect={(emoji: EmojiProps) => {
          setText(prev => prev + emoji.native);
        }}
      />

      <GifPicker
        onSelect={(gif, e) => {
          e.preventDefault();

          setMedia(prev => [
            ...prev,
            { src: gif.images.original.url, type: "image" },
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
