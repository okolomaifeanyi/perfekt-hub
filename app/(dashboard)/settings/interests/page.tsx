import NavBar from "../../[username]/components/NavBar";
import { InterestsSettingsClient } from "@/components/settings/InterestsSettingsClient";

export default function InterestsSettingsPage() {
  return (
    <section className="space-y-6">
      <NavBar title="Interests" backHref="/settings" />
      <div className="space-y-6 p-4">
        <InterestsSettingsClient />
      </div>
    </section>
  );
}
