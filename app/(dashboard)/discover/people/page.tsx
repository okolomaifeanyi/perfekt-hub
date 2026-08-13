import NavBar from "../../[username]/components/NavBar";
import { PeopleListClient } from "./PeopleListClient";

export default function PeopleDiscoverPage() {
  return (
    <>
      <NavBar title="People" />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Discover people</h1>
          <p className="text-sm text-muted-foreground">
            Everyone on Perfekthub — newest first, or ranked by followers.
          </p>
        </div>
        <PeopleListClient />
      </main>
    </>
  );
}
