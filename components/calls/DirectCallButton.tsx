"use client";

import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStartCall } from "@/hooks/useStartCall";

// Split out from MessagePage so it can be loaded via next/dynamic({ssr:
// false}) wherever it's used — see the comment on that import for why.
export default function DirectCallButton({
  targetUid,
  label,
  variant = "ghost",
  className = "size-8",
}: {
  targetUid: string;
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
}) {
  const { startDirectCall, ready } = useStartCall();

  return (
    <Button
      size={label ? "sm" : "icon"}
      variant={variant}
      className={className}
      title="Call"
      disabled={!ready}
      onClick={() => void startDirectCall(targetUid)}
    >
      <Phone className={label ? "mr-1.5 size-4" : "size-4"} />
      {label}
    </Button>
  );
}
