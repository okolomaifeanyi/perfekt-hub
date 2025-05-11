import Feed from "@/components/feed/Feed";
import NavBar from "@/components/NavBar";
import PostComposer from "@/components/post-composer/PostComposer";
// import Stories from "@/components/Stories";
import { PostProps, UserProps } from "@/lib/types";

export default async function Home() {
  const [postsRes, usersRes] = await Promise.all([
    fetch("https://dummyjson.com/posts"),
    fetch("https://dummyjson.com/users"),
  ]);

  const { posts }: { posts: PostProps[] } = await postsRes.json();
  const { users }: { users: UserProps[] } = await usersRes.json();

  const userMap = Object.fromEntries(users.map(user => [user.id, user]));

  const enrichedPosts: PostProps[] = posts.map(post => ({
    ...post,
    user: userMap[post.id],
  }));

  return (
    <div className="px-4 pb-8 space-y-8 max-w-[600px] mx-auto">
      <NavBar />
      {/* <Stories user={enrichedPosts} /> */}
      <PostComposer />
      <Feed posts={enrichedPosts} />
    </div>
  );
}
