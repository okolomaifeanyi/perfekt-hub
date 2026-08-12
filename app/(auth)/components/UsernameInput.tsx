"use client";

import { ReactNode, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormState } from "@/lib/definitions";

export default function UsernameInput({
  initialUsername,
  state,
  renderAlert,
}: {
  initialUsername?: string;
  state: FormState;
  renderAlert: (title: string, description: string | string[]) => ReactNode;
}) {
  const [username, setUsername] = useState(initialUsername || "");
  const [availability, setAvailability] = useState<
    "available" | "taken" | "unknown"
  >("unknown");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const delayDebounce = window.setTimeout(() => {
      if (username.trim().length < 2) return;

      const checkUsername = async () => {
        setChecking(true);

        try {
          const response = await fetch(
            `/api/check-username?username=${encodeURIComponent(username)}`,
            { signal }
          );
          const data = await response.json().catch(() => null);

          if (!response.ok) {
            setAvailability("unknown");
            return;
          }

          setAvailability(data?.available ? "available" : "taken");
        } catch (error) {
          if ((error as DOMException)?.name !== "AbortError") {
            setAvailability("unknown");
          }
        } finally {
          setChecking(false);
        }
      };

      void checkUsername();
    }, 500);

    return () => {
      clearTimeout(delayDebounce);
      controller.abort();
    };
  }, [username]);

  return (
    <div className="grid gap-2">
      <Label htmlFor="username">Username</Label>
      <Input
        id="username"
        name="username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        className={
          availability === "taken"
            ? "border-red-500 focus-visible:ring-red-500"
            : ""
        }
        required
        autoComplete="off"
      />
      <p className="text-sm h-5">
        {username.length >= 2 &&
          (checking ? (
            <span className="text-muted-foreground">Checking...</span>
          ) : availability === "available" ? (
            <span className="text-green-500">Available</span>
          ) : availability === "taken" ? (
            <span className="text-red-500">Already taken</span>
          ) : (
            <span className="text-muted-foreground">
              Unable to verify right now
            </span>
          ))}
      </p>

      {state?.errors?.username &&
        renderAlert("Username Error", state.errors.username)}
    </div>
  );
}
