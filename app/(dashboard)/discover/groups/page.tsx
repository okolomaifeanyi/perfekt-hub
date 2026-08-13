import NavBar from "../../[username]/components/NavBar";
import { GroupsListClient } from "./GroupsListClient";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";

export default function GroupsDiscoverPage() {
  return (
    <>
      <NavBar title="Groups" />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Groups</h1>
            <p className="text-sm text-muted-foreground">
              Public groups you can join across Perfekthub.
            </p>
          </div>
          <CreateGroupDialog />
        </div>

        <GroupsListClient />
      </main>
    </>
  );
}
