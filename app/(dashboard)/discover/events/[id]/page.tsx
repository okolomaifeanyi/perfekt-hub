import { notFound } from "next/navigation";
import NavBar from "../../../[username]/components/NavBar";
import { getEventDetail } from "@/app/actions/events";
import { EventDetailClient } from "./EventDetailClient";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getEventDetail(id);
  if (!detail) return notFound();

  return (
    <>
      <NavBar title={detail.event.title} />
      <main className="container mx-auto px-4 py-6">
        <EventDetailClient detail={detail} />
      </main>
    </>
  );
}
