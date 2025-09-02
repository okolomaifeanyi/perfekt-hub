import MyAvatar from "@/components/feed/post/MyAvatar";
import Name from "@/components/feed/post/Name";
import { getCompactTimeAgo } from "@/components/utils";
import { PostProps, UserProps } from "@/lib/types";
import { Dot } from "lucide-react";
import Link from "next/link";

const PostIdDate = ({ user, post }: { user: UserProps, post: PostProps }) => {
  return (
    <div className="flex space-x-2 items-center">
      <MyAvatar
        photoURL={user.photoURL}
        username={user.username}
        fullName={user.fullName}
      />
      <Link href={`/${user.username}`}>
        <Name fullName={user.fullName} username={user.username} />
      </Link>
      <span className="text-xs text-muted-foreground flex items-center">
        <Dot />
        {getCompactTimeAgo(new Date(post.createdAt))}
      </span>
    </div>
  );
};

export default PostIdDate;
