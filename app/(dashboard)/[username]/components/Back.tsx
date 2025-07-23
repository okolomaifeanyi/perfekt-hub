"use client"

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

const Back = () => {
    const router = useRouter()
  return (
    <Button variant="ghost" onClick={() => router.back()}>
      <ArrowLeft />
    </Button>
  );
};

export default Back;
