"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserStore } from "@/lib/store/useUserStore";
import { fetchMessageSearchUsers } from "@/lib/message-search-api.mjs";
import { useDirectMessage } from "@/hooks/useDirectMessage";
import { Loader2, MessageSquarePlus } from "lucide-react";
import JustAvatar from "@/components/JustAvatar";
import { UserProps } from "@/lib/types";

export default function NewConversationDialog() {
  const currentUser = useUserStore(state => state.user);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProps[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const { startDM, loading: dmLoading } = useDirectMessage();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSearching(false);
      setSelectedUid(null);
      return;
    }

    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    let active = true;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const users = (await fetchMessageSearchUsers({ query: term })) as UserProps[];
        if (!active) return;
        setResults(
          users.filter(
            (candidate: UserProps) =>
              candidate.uid !== currentUser?.uid &&
              candidate.username?.length > 0
          )
        );
      } catch (error) {
        if (!active) return;
        console.error("Message user search failed:", error);
        setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [currentUser?.uid, open, query]);

  const handleStart = async (target: UserProps) => {
    setSelectedUid(target.uid);
    try {
      await startDM(target.uid);
      setOpen(false);
    } finally {
      setSelectedUid(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2">
          <MessageSquarePlus className="size-4" />
          New message
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>
            Search by username or name to start a new conversation.
          </DialogDescription>
        </DialogHeader>

        <Input
          id="new-conversation-search"
          name="search"
          aria-label="Search users"
          autoComplete="off"
          autoFocus
          placeholder="Search users"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />

        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {searching ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Searching...
            </div>
          ) : results.length > 0 ? (
            results.map(user => (
              <Button
                key={user.uid}
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start gap-3 px-3 py-3 text-left"
                onClick={() => void handleStart(user)}
                disabled={dmLoading || selectedUid === user.uid}
              >
                <JustAvatar
                  size={36}
                  username={user.username}
                  photoURL={user.photoURL}
                  fullName={user.fullName}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {user.fullName || user.username}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    @{user.username}
                  </p>
                </div>
              </Button>
            ))
          ) : query.trim().length >= 2 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No matching users found.
            </p>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Type at least two characters to search.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
