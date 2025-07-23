// import { Muted } from "@/components/Typography";
import { Button } from "@/components/ui/button";
import {
  Heart,
  MessageCircleMore,
  Quote,
  Save,
  Share,
  ThumbsDown,
  // View,
} from "lucide-react";

interface ReactionsProps {
  likes?: number;
  dislikes?: number;
  views?: number;
  comments?: number[];
  quote?: number;
  save?: number;
}

const Reactions = ({ reactions }: { reactions?: ReactionsProps }) => {
  return (
    <div className="flex justify-between">
      <div className="flex space-x-2 items-center">
        <Button size="sm" variant="outline" title="Like">
          <Heart /> <span>{reactions?.likes || 0}</span>
        </Button>
        <Button size="sm" variant="outline" title="dislike">
          <ThumbsDown />
        </Button>
        {/* <Button size="sm" variant="outline" title="views">
          <View /> <span>{reactions?.views || 0}</span>
        </Button> */}
        <Button size="sm" variant="outline" title="Comment">
          <MessageCircleMore /> <span>{reactions?.comments?.length || 0}</span>
        </Button>
        <Button variant="outline" title="Quote" size="sm">
          <Quote /> <span>{reactions?.quote || 0}</span>
        </Button>
        <Button variant="outline" title="Save" size="sm">
          <Save /> <span>{reactions?.save || 0}</span>
        </Button>
        <Button size="sm" variant="outline" title="Share">
          <Share />
        </Button>
      </div>
    </div>
  );
};

export default Reactions;
