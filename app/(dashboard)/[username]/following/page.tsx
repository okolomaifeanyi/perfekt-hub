import { getUserByUsername } from "@/lib/utils";
import { FollowerList } from "../social/FollowersList";
import NavBar from "../components/NavBar";

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
  }) {
  const { username } = await params;
  const user = await getUserByUsername(username);
  if (!user) return <p>User not found</p>;

  return (
    <>
      <NavBar
        title={`Following`}
        extra={<span className="text-primary pr-2">{`@${username}`}</span>}
      />
      <div className="max-w-2xl mx-auto p-4">
        <FollowerList userId={user.uid} type="following" />
      </div>
    </>
  );
}
