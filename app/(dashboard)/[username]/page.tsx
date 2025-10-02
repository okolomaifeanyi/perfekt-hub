import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import ProfileClient from "./components/ProfileClient";
import Cover from "./components/Cover";

export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  // Lookup user by username
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("username", "==", username));
  const snapshot = await getDocs(q);
  if (snapshot.empty) throw new Error("User not found");

  const userDoc = snapshot.docs[0];
  const data = userDoc.data();

  // ✅ Safe createdAt handling
  let createdAt: Date | null = null;
  if (data.createdAt) {
    if (typeof data.createdAt.toDate === "function") {
      createdAt = data.createdAt.toDate();
    } else if (typeof data.createdAt === "number") {
      createdAt = new Date(data.createdAt); // stored as millis
    } else if (typeof data.createdAt === "string") {
      createdAt = new Date(data.createdAt);
    }

    const profile = {
      uid: userDoc.id,
      username: data.username,
      fullName: data.fullName ?? "",
      photoURL: data.photoURL ?? "",
      coverURL:
        data.coverURL || `https://picsum.photos/seed/${data.username}/1200/400`,
      bio: data.bio ?? "",
      website: data.website ?? "",
      location: data.location ?? "",
      followersCount: data.followersCount ?? 0,
      followingCount: data.followingCount ?? 0,
      friendsCount: data.friendsCount ?? 0,
      postsCount: data.postsCount ?? 0,
      createdAt,
      relationship: data.relationship ?? "",
      country: data.country ?? "",
      dob: data.dob ?? "",
      education: data.education ?? "",
      company: data.company ?? "",
      linkedin: data.linkedin ?? "",
      github: data.github ?? "",
      twitter: data.twitter ?? "",
      work: data.work ?? "",
      phoneNumber: data.phoneNumber ?? "",
      instagram: data.instagram ?? "",
      email: data.email ?? "",
    };

    return (
      <div className="w-full">
        <Cover uid={profile.uid} />

        <ProfileClient profile={profile} />
      </div>
    );
  }
}
