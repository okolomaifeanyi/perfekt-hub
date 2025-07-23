import PostComposer from "@/components/post-composer/PostComposer";
import PostCard from "./components/PostCard";
import { getPost } from "@/lib/data";
import NavBar from "../components/NavBar";
import { notFound } from "next/navigation";
import ClientFeed from "@/components/feed/post/ClientFeed";

const page = async ({ params }: { params: Promise<{ postId: string }> }) => {
  const { postId } = await params;

  const post = await getPost(postId);
  if (!post) return notFound();

  // 🧠 Traverse up to the root post
  const parentChain = [];
  let current = post;

  while (current?.parentPostId) {
    const parent = await getPost(current.parentPostId);
    if (!parent) break;
    parentChain.unshift(parent); // unshift to display oldest first (top-most parent first)
    current = parent;
  }

  // const comments = await getComments(postId);
  


  return (
    <div className="space-y-4 pb-4 w-full mx-auto px-4">
      <NavBar title="Post" />

      <div className="relative pl-4 border-l border-muted space-y-4">
        {parentChain.map(parent => (
          <div key={parent.id}>
            <PostCard post={parent} />
          </div>
        ))}
      </div>

      <div className="relative">
        <div className="absolute -top-4 left-0 h-4 w-px " />
        <PostCard post={post} />
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
