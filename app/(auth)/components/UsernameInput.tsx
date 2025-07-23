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
  const [isAvailable, setIsAvailable] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const delayDebounce = setTimeout(() => {
      if (username.trim().length < 2) return;

      setChecking(true);
      fetch(`/api/check-username?username=${username}`, { signal })
        .then(res => res.json())
        .then(data => {
          setIsAvailable(data.available);
          setChecking(false);
        })
        .catch(err => {
          if (err.name !== "AbortError") {
            console.error(err);
            setChecking(false);
          }
        });
    }, 500);

    return () => {
      clearTimeout(delayDebounce);
      controller.abort(); // cancel previous request
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
          !isAvailable ? "border-red-500 focus-visible:ring-red-500" : ""
        }
        required
        autoComplete="off"
      />
      <p className="text-sm h-5">
        {username.length >= 2 &&
          (checking ? (
            <span className="text-muted-foreground">Checking...</span>
          ) : isAvailable ? (
            <span className="text-green-500">✅ Available</span>
          ) : (
            <span className="text-red-500">❌ Already taken</span>
          ))}
      </p>

      {state?.errors?.username &&
        renderAlert("Username Error", state.errors.username)}
    </div>
  );
}
