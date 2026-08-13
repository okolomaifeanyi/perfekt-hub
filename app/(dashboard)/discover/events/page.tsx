import NavBar from "../../[username]/components/NavBar";
import { EventsListClient } from "./EventsListClient";
import { CreateEventDialog } from "@/components/CreateEventDialog";

export default function EventsDiscoverPage() {
  return (
    <>
      <NavBar title="Events" />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Upcoming events</h1>
            <p className="text-sm text-muted-foreground">
              Public events happening across Perfekthub.
            </p>
          </div>
          <CreateEventDialog />
        </div>

        <EventsListClient />
      </main>
    </>
  );
}
