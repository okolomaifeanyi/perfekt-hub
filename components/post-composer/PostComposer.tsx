"use client";

import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { useState } from "react";
import { MediaProps } from "@/lib/types";
import MediaGallery from "./MediaGallery";
import Buttons from "./Buttons";
import MyAvatar from "../feed/post/MyAvatar";

const PostComposer = () => {
  const [text, setText] = useState("");
  const [media, setMedia] = useState<MediaProps[]>([]);
  const [gifDialogOpen, setGifDialogOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex space-x-2">
        <MyAvatar
          src="https://i.pravatar.cc/500?u='James Davis'"
          alt="James Davis"
          fallback="jd"
        />

        <div className="space-y-2 w-full">
          <Textarea
            onChange={e => setText(e.target.value)}
            value={text}
            placeholder="What's on your mind?"
            className="resize-none"
          />

          <div className="flex justify-between">
            <Buttons
              setText={setText}
              setMedia={setMedia}
              setGifDialogOpen={setGifDialogOpen}
              gifDialogOpen={gifDialogOpen}
            />

            <Button size="sm">Post</Button>
          </div>
        </div>
      </div>
      <MediaGallery media={media} setMedia={setMedia} />
    </div>
  );
};

export default PostComposer;
