"use client";

import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStartCall } from "@/hooks/useStartCall";

// Split out from MessagePage so it can be loaded via next/dynamic({ssr:
// false}) there — see the comment on that import for why.
export default function DirectCallButton({ targetUid }: { targetUid: string }) {
  const { startDirectCall, ready } = useStartCall();

  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-8"
      title="Call"
      disabled={!ready}
      onClick={() => void startDirectCall(targetUid)}
    >
      <Phone className="size-4" />
    </Button>
  );
}
