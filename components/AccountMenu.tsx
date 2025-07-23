"use client";

import { logoutClient } from "@/app/(auth)/lib/utils";
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { useUserStore } from "@/lib/store/useUserStore";
import { useRouter } from "next/navigation";

export function AccountMenu() {
  const { setGlobalLoading } = useUserStore(state => state);

  const router = useRouter();

  return (
    <DropdownMenuContent className="w-56" align="start">
      <DropdownMenuLabel>My Account</DropdownMenuLabel>

      <DropdownMenuGroup>
        <DropdownMenuItem>
          Settings
          <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuSeparator />

      <DropdownMenuItem
        onClick={() => {
          setGlobalLoading(true);
          logoutClient(router);
        }}
      >
        Logout
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
