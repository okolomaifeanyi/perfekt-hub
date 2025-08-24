import PostComposer from "@/components/post-composer/PostComposer";
import PostCard from "./components/PostCard";
import { getPost, getUser } from "@/lib/data";
import NavBar from "../components/NavBar";
import { notFound } from "next/navigation";
import ClientFeed from "@/components/feed/post/ClientFeed";
import { PostProps, UserProps } from "@/lib/types";

const page = async ({ params }: { params: Promise<{ postId: string }> }) => {
  const { postId } = await params;

  const post = await getPost(postId);
  if (!post) return notFound();

  const parentChain = [];
  let current = post;

  while (current?.parentPostId) {
    const parent = await getPost(current.parentPostId);
    if (!parent) break;
    parentChain.unshift(parent);
    current = parent;
  }

  let quotedPost: PostProps | null = null;
  let qpUser: UserProps | null = null;
  if (current.quotePostId) {
    quotedPost = await getPost(current.quotePostId);

    qpUser = quotedPost ? await getUser(quotedPost.userId) : null;
  }

  const user = await getUser(post.userId);
  if (!user) return null;

  return (
    <div className="space-y-4 pb-4 w-full mx-auto px-4">
      <NavBar title="Post" />

      <div className="relative pl-4 border-l border-muted space-y-4">
        {parentChain.map(async parent => {
          const userParent = await getUser(parent.userId);
          if (!userParent) return null;
          return (
            <div key={parent.id}>
              <PostCard post={parent} user={userParent} />
            </div>
          );
        })}
      </div>

      <div className="relative">
        <div className="absolute -top-4 left-0 h-4 w-px " />
        <PostCard quotedPost={quotedPost} quotedUser={qpUser} post={post} user={user} />
      </div>

      <div className="px-2">
        <PostComposer
          sendButton="Reply"
          placeholder="Reply this post"
          parentPostId={post.id}
        />

        <ClientFeed postId={post.id} />
      </div>
    </div>
  );
};

export default page;
