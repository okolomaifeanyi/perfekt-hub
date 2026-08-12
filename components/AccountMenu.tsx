"use client";

import { logoutClient } from "@/app/(auth)/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUserStore } from "@/lib/store/useUserStore";
import {
  buildSavedAccountFromSession,
  readSavedAccounts,
  removeSavedAccount,
  rememberSavedAccount,
} from "@/lib/saved-accounts.mjs";
import { cn } from "@/lib/utils";
import { Settings2, UserPlus2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import JustAvatar from "./JustAvatar";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";

type SavedAccount = {
  uid: string;
  email: string;
  username: string;
  fullName: string;
  photoURL: string;
  providerId: string;
  accessToken: string;
  refreshToken: string;
  lastUsedAt: string;
};

function SavedAccountRow({
  account,
  active,
  onSwitch,
  onRemove,
}: {
  account: SavedAccount;
  active: boolean;
  onSwitch: (account: SavedAccount) => void;
  onRemove: (uid: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <DropdownMenuItem
        className="flex-1 items-center gap-3 py-2"
        onSelect={event => {
          event.preventDefault();
          onSwitch(account);
        }}
      >
        <JustAvatar
          size={32}
          username={account.username}
          photoURL={account.photoURL || undefined}
          fullName={account.fullName || undefined}
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {account.fullName || account.username}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            @{account.username}
          </p>
        </div>

        {active && <DropdownMenuShortcut>Current</DropdownMenuShortcut>}
      </DropdownMenuItem>

      <button
        type="button"
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground",
          active ? "opacity-40" : ""
        )}
        onClick={() => onRemove(account.uid)}
        aria-label={`Remove ${account.username} from saved accounts`}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function AccountMenu() {
  const { setGlobalLoading, user: currentUser } = useUserStore(state => state);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      setSavedAccounts(readSavedAccounts(window.localStorage));
    };

    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [currentUser?.uid]);

  const handleSwitchAccount = async (account: SavedAccount) => {
    if (account.uid === currentUser?.uid) {
      return;
    }

    if (!account.accessToken || !account.refreshToken) {
      toast.error("Saved account is missing session data. Sign in again.");
      return;
    }

    setGlobalLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error, data } = await supabase.auth.setSession({
        access_token: account.accessToken,
        refresh_token: account.refreshToken,
      });

      if (error) throw error;

      if (data.user && data.session) {
        const nextAccounts = rememberSavedAccount(window.localStorage, {
          ...buildSavedAccountFromSession({
            user: data.user,
            session: data.session,
            profile: {
              uid: data.user.id,
              email: data.user.email ?? "",
              username: account.username,
              fullName: account.fullName,
              photoURL: account.photoURL,
            },
          }),
          lastUsedAt: new Date().toISOString(),
        });
        setSavedAccounts(nextAccounts);
      }

      router.refresh();
    } catch (error) {
      console.error("Account switch failed:", error);
      toast.error("Could not switch account");
      setGlobalLoading(false);
    }
  };

  const handleRemoveAccount = (uid: string) => {
    removeSavedAccount(window.localStorage, uid);
    setSavedAccounts(readSavedAccounts(window.localStorage));
  };

  return (
    <DropdownMenuContent className="w-72" align="start">
      <DropdownMenuLabel>Current account</DropdownMenuLabel>
      <div className="px-2 pb-2">
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <JustAvatar
            size={40}
            username={currentUser?.username}
            photoURL={currentUser?.photoURL}
            fullName={currentUser?.fullName}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {currentUser?.fullName || currentUser?.username}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              @{currentUser?.username}
            </p>
          </div>
        </div>
      </div>

      <DropdownMenuSeparator />

      <DropdownMenuLabel>Saved accounts</DropdownMenuLabel>
      <div className="space-y-1 px-1 pb-1">
        {savedAccounts.length > 0 ? (
          savedAccounts.map(account => (
            <SavedAccountRow
              key={account.uid}
              account={account}
              active={account.uid === currentUser?.uid}
              onSwitch={handleSwitchAccount}
              onRemove={handleRemoveAccount}
            />
          ))
        ) : (
          <div className="px-2 py-2 text-sm text-muted-foreground">
            No saved accounts yet.
          </div>
        )}
      </div>

      <DropdownMenuSeparator />

      <DropdownMenuItem asChild>
        <Link href="/login?addAccount=1" className="flex items-center gap-2">
          <UserPlus2 className="size-4" />
          Add another account
        </Link>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem asChild>
        <Link href="/settings" className="flex items-center gap-2">
          <Settings2 className="size-4" />
          Settings
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem
        variant="destructive"
        onSelect={() => {
          setGlobalLoading(true);
          void logoutClient(router);
        }}
      >
        Logout
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
