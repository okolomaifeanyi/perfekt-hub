import { H2 } from "@/components/Typography";
// import { UserProps } from "@/lib/types";
import UserClient from "./UserClient";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { notFound } from "next/navigation";
import { db } from "@/lib/firebase";
import { PostProps, UserProps } from "@/lib/types";
import UserFeed from "./[postId]/components/UserFeed";
// import { getInitialUserPosts } from "@/lib/data";
// import UserFeed from "./[postId]/components/UserFeed";

// export async function generateStaticParams() {
//   const { users } = await fetch(`https://dummyjson.com/users`).then(res =>
//     res.json()
//   );

//   return users.map((user: UserProps) => ({
//     username: user.username,
//   }));
// }

export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const usersRef = collection(db, "users");
  const userQuery = query(usersRef, where("username", "==", username));
  const userSnap = await getDocs(userQuery);

  if (userSnap.empty) return notFound();

  const userDoc = userSnap.docs[0];
  const user = { id: userDoc.id, ...(userDoc.data() as UserProps) };

  // Fetch posts by userId
  const postsRef = collection(db, "posts");
  const postsQuery = query(
    postsRef,
    where("userId", "==", user.id),
    orderBy("createdAt", "desc")
  );
  const postsSnap = await getDocs(postsQuery);
  const posts: PostProps[] = postsSnap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      content: data.content,
      media: data.media || [],
      createdAt: data.createdAt?.toDate().toISOString() ?? null,
      username: data.username,
      userFullName: data.userFullName || "",
      userPhotoURL: data.userPhotoURL,
    } as PostProps;
  });

  return (
    <div className="w-full">
      <UserClient />

      <div className="px-4 py-4">
        <div className="my-4">
          <H2>Posts</H2>
        </div>

        <UserFeed initialUserPosts={posts} userId={user.id} />
      </div>
    </div>
  );
}
