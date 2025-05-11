// import { Muted } from "@/components/Typography";
import { Button } from "@/components/ui/button";
import { ReactionProps } from "@/lib/types";
import {
  Heart,
  MessageCircleMore,
  // Repeat2,
  // Share,
  ThumbsDown,
  View,
} from "lucide-react";

const Reactions = ({ reactions, views }: { reactions: ReactionProps, views: number }) => {
  return (
    <div className="flex justify-between items-center mt-2">
      <div className="flex space-x-2 items-center mx-auto">
        <Button size="sm" variant="outline" title="Like">
          <Heart /> <span>{reactions?.likes}</span>
        </Button>
        <Button size="sm" variant="outline" title="dislike">
          <ThumbsDown /> <span>{reactions?.dislikes}</span>
        </Button>
        <Button size="sm" variant="outline" title="views">
          <View /> <span>{views}</span>
        </Button>
        <Button size="sm" variant="outline" title="Comment">
          <MessageCircleMore />
        </Button>
        {/* <Button variant="outline" title="Repost" size="icon">
          <Repeat2 /> <span>{post.likes}</span>
          </Button> */}
      </div>
      {/* <Button size="sm" variant="outline" title="Share">
        <Share />
      </Button> */}
      {/* <Muted className="text-xs">2 hours ago</Muted> */}
    </div>
  );
};

export default Reactions;
