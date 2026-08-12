import { notFound } from "next/navigation";

import NavBar from "../components/NavBar";
import ProfileGroupsGrid from "../components/ProfileGroupsGrid";
import { getUserByUsername } from "@/lib/utils";

export default async function GroupsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await getUserByUsername(username);

  if (!user) {
    return notFound();
  }

  return (
    <>
      <NavBar
        title="Groups"
        extra={<span className="text-primary pr-2">{`@${username}`}</span>}
      />
      <div className="mx-auto max-w-4xl p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Groups you belong to stay on your profile.
        </p>
        <ProfileGroupsGrid uid={user.uid} />
      </div>
    </>
  );
}
