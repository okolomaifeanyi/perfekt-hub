import PostCard from "./components/PostCard";
import { getPost, getUser } from "@/lib/data";
import NavBar from "../components/NavBar";
import { notFound } from "next/navigation";
import ViewTracker from "./components/ViewTracker";
import CommentFeed from "@/components/feed/post/CommentFeed";

const page = async ({ params }: { params: Promise<{ postId: string }> }) => {
  const { postId } = await params;

  const post = await getPost(postId);
  if (!post) return notFound();

  // The parent chain must be walked one level at a time (each id depends on
  // the previous post), but it doesn't depend on the post author's profile —
  // run them concurrently instead of paying for both waterfalls back to back.
  const walkParentChain = async () => {
    const parentChain = [];
    let current = post;

    while (current?.parentPostId) {
      const parent = await getPost(current.parentPostId);
      if (!parent) break;
      parentChain.unshift(parent);
      current = parent;
    }

    return parentChain;
  };

  const [parentChain, user] = await Promise.all([
    walkParentChain(),
    getUser(post.userId),
  ]);
  if (!user) return null;

  const parentChainWithUsers = await Promise.all(
    parentChain.map(async parent => {
      const userParent = await getUser(parent.userId);
      return userParent ? { parent, userParent } : null;
    })
  );

  return (
    <div className="space-y-4 pb-4 w-full mx-auto">
      <NavBar title="Post" />

      <div className="px-2">
        <div className="relative pl-4 border-l border-muted space-y-4">
          {parentChainWithUsers.map(item => {
            if (!item) return null;
            return (
              <PostCard isPostPage key={item.parent.id} post={item.parent} />
            );
          })}
        </div>

        <div className="relative">
          <div className="absolute -top-4 left-0 h-4 w-px " />
          <PostCard isPostPage className="mt-4" post={post} />
        </div>

        <div className="px-2 mt-4">
          <CommentFeed />
          <ViewTracker postId={postId} />
        </div>
      </div>
    </div>
  );
};

export default page;
