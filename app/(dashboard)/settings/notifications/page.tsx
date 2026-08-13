import NavBar from "../../[username]/components/NavBar";
import { NotificationSettingsClient } from "@/components/settings/NotificationSettingsClient";

export default function NotificationSettingsPage() {
  return (
    <section className="space-y-6">
      <NavBar title="Notifications" backHref="/settings" />
      <div className="space-y-6 p-4">
        <NotificationSettingsClient />
      </div>
    </section>
  );
}
