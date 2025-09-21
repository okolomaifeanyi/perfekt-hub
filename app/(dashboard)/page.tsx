import Feed from "@/components/feed/Feed";
import PostComposer from "@/components/post-composer/PostComposer";

export default function Home() {
  return (
    <main className="p-4">
      <PostComposer />
      <Feed />
    </main>
  );
}
