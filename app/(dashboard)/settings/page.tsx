import { ThemePreferenceCard } from "@/components/settings/ThemePreferenceCard";
import { DataSaverCard } from "@/components/settings/DataSaverCard";
import { ChevronRightIcon, UserIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import NavBar from "../[username]/components/NavBar";

const page = () => {
  return (
    <section className="space-y-6">
      <NavBar title="Setting and Privacy" />

      <div className="space-y-6 p-4">
        <ThemePreferenceCard />
        <DataSaverCard />

        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Account</h2>
          <Link
            href="/settings/account"
            className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserIcon className="size-5" />
              </span>
              <div className="space-y-1 text-left">
                <p className="font-medium">Your Account</p>
                <p className="text-sm text-muted-foreground">
                  Manage your profile and delete your account.
                </p>
              </div>
            </div>
            <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" />
          </Link>
        </section>
      </div>
    </section>
  );
};

export default page;
