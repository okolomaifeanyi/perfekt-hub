import NavBar from "../../[username]/components/NavBar";
import { SavesListClient } from "./SavesListClient";

export default function SavesDiscoverPage() {
  return (
    <>
      <NavBar title="Top Saves" />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Saved posts</h1>
          <p className="text-sm text-muted-foreground">
            Posts people are saving — recently saved first, or ranked by save count.
          </p>
        </div>
        <SavesListClient />
      </main>
    </>
  );
}
