import Feed from "@/components/feed/Feed";
import PostComposer from "@/components/post-composer/PostComposer";

export default function Home() {
  return (
    <div className="max-w-full px-4 py-4">
      <PostComposer />
      <Feed />
    </div>
  );
}
