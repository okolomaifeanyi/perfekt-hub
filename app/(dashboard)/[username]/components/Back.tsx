"use client"

import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import React from "react";
import { cn } from "@/lib/utils";

const Back = ({ href, className }: { href?: string; className?: string }) => {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      aria-label="Back"
      className={cn(className)}
      onClick={() => (href ? router.push(href) : router.back())}
    >
      <ArrowLeftIcon />
    </Button>
  );
};

export default Back;
