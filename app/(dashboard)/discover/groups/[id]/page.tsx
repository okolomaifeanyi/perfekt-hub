import { notFound } from "next/navigation";
import NavBar from "../../../[username]/components/NavBar";
import { getGroupDetail } from "@/app/actions/groups";
import { listGroupPolls } from "@/app/actions/polls";
import { GroupDetailClient } from "./GroupDetailClient";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getGroupDetail(id);
  if (!detail) return notFound();

  const polls = await listGroupPolls(id);

  return (
    <>
      <NavBar title={detail.group.name} />
      <main className="container mx-auto px-4 py-6">
        <GroupDetailClient detail={detail} initialPolls={polls} />
      </main>
    </>
  );
}
