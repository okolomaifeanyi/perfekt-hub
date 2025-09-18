"use client";

import { ReactNode, useRef } from "react";
// import MobileNavBar from "@/components/MobileNavBar";
import TopNav from "@/components/TopNav";

const Main = ({ children }: { children: ReactNode }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={scrollRef} className="h-screen overflow-y-auto max-w-full overflow-x-hidden">
      <TopNav scrollRef={scrollRef} />
      <main>{children}</main>
      {/* <MobileNavBar scrollRef={scrollRef} /> */}
    </div>
  );
};

export default Main;
