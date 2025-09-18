"use client"

import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import React from "react";

const Back = () => {
    const router = useRouter()
  return (
    <Button variant="ghost" onClick={() => router.back()}>
      <ArrowLeftIcon />
    </Button>
  );
};

export default Back;
