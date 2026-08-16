import { notFound } from "next/navigation";

import NavBar from "../components/NavBar";
import { MediaGrid } from "../components/MediaGrid";
import { getUserByUsername } from "@/lib/utils";
import AddVideoButton from "@/components/post-composer/AddVideoButton";

export default async function VideosPage({
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
        title="Videos"
        extra={<span className="text-primary pr-2">{`@${username}`}</span>}
      />
      <div className="mx-auto max-w-5xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Videos on your profile are collected here.
          </p>
          <AddVideoButton targetUid={user.uid} variant="outline" size="sm" />
        </div>
        <MediaGrid uid={user.uid} mediaType="video" />
      </div>
    </>
  );
}
