import { H2, Large, Muted } from "@/components/Typography";
import { UserProps } from "@/lib/types";
import UserFeed from "./[postId]/components/UserFeed";
import NavBar from "./components/NavBar";
import Image from "next/image";
import MyAvatar from "@/components/feed/post/MyAvatar";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default async function page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const usersRef = collection(db, "users");
  const q = query(usersRef, where("username", "==", username));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error("User not found");
  }

  const userDoc = snapshot.docs[0];
  const userData = userDoc.data() as UserProps;

  const user = {
    uid: userDoc.id,
    username: userData.username,
    fullName: userData.fullName,
    photoURL: userData.photoURL,
  };

  const postRef = collection(db, "posts");
  const q2 = query(postRef, where("userId", "==", user.uid));
  const postSnapshot = await getDocs(q2);

  const posts = postSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      content: data.content,
      media: data.media || [],
      parentPostId: data.parentPostId,
      createdAt: data.createdAt.toDate().toISOString(),
      userId: data.userId,
    };
  });

  return (
    <div className="w-full">
      <div>
        <NavBar title={user.fullName || user.username} />

        <div className="h-[200px] relative">
          <Image
            src={`https://picsum.photos/seed/${user.username}/600/300`}
            alt="Wall"
            width={600}
            height={300}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="-mt-20 flex justify-center">
          <div className="!text-center">
            <MyAvatar size={200} username={user.username} photoURL={user.photoURL} fullName={user.fullName} />

            {user.fullName && (
              <Large>
                <strong>{user.fullName}</strong>
              </Large>
            )}

            <Muted>@{user.username}</Muted>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="my-4">
          <H2>Posts</H2>
        </div>

        <UserFeed initialUserPosts={posts} userId={user.uid} />
      </div>
    </div>
  );
}
