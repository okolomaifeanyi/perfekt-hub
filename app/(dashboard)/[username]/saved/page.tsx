import { notFound } from "next/navigation";

import NavBar from "../components/NavBar";
import SavedPostsGrid from "../components/SavedPostsGrid";
import { getUserByUsername } from "@/lib/utils";

export default async function SavedPage({
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
        title="Saved"
        extra={<span className="text-primary pr-2">{`@${username}`}</span>}
      />
      <div className="mx-auto max-w-4xl p-4 space-y-8">
        <section className="space-y-3">
          <h1 className="text-2xl font-semibold">Saved posts</h1>
          <SavedPostsGrid uid={user.uid} />
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Saved videos</h2>
          <SavedPostsGrid uid={user.uid} mediaType="video" />
        </section>
      </div>
    </>
  );
}
