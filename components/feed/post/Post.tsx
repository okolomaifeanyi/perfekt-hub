import Image from "next/image";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import Text from "./Text";
import Reactions from "./Reactions";
import MyAvatar from "./MyAvatar";
import { PostProps } from "@/lib/types";
import Name from "./Name";

const Post: React.FC<PostProps> = props => {
  const { id, body, userId, user, reactions } = props;

  return (
    <li key={id}>
      <Card className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex space-x-2 items-center">
            <MyAvatar
              src={`https://i.pravatar.cc/500?u=${user?.username}`}
              alt={`${user?.firstName} ${user?.lastName}`}
              fallback={`${user?.firstName[0]}${user?.lastName[0]}`}
            />
            {user && <Name user={user} />}
          </div>

          <Button>Follow</Button>
        </div>

        <Text text={body} />

        <Image
          src={
            `https://picsum.photos/seed/${userId}/600/300` || user?.image || ""
          }
          alt="Post"
          width={300}
          height={300}
          className="w-full h-[250px] object-cover"
        />

        {reactions && <Reactions reactions={reactions} />}
      </Card>
    </li>
  );
};

export default Post;
