"use client";

import { ReactNode, useRef } from "react";
import MobileNavBar from "@/components/MobileNavBar";
import TopNav from "@/components/TopNav";

const Main = ({ children }: { children: ReactNode }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={scrollRef} className="h-screen overflow-y-auto">
      <TopNav scrollRef={scrollRef} />
      <main>{children}</main>
      <MobileNavBar scrollRef={scrollRef} />
    </div>
  );
};

export default Main;
