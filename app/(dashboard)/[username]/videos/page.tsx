import { notFound } from "next/navigation";

import NavBar from "../components/NavBar";
import { MediaGrid } from "../components/MediaGrid";
import { getUserByUsername } from "@/lib/utils";

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
        <p className="text-sm text-muted-foreground">
          Videos on your profile are collected here.
        </p>
        <MediaGrid uid={user.uid} mediaType="video" />
      </div>
    </>
  );
}
