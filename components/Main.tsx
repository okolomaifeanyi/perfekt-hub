"use client";

import { ReactNode, useRef } from "react";
// import MobileNavBar from "@/components/MobileNavBar";
import TopNav from "@/components/TopNav";

type MainProps = {
  children: ReactNode;
  leftSidebar?: ReactNode;
  rightSidebar?: ReactNode;
};

const Main = ({ children, leftSidebar, rightSidebar }: MainProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={scrollRef}
      data-dashboard-scroll-container="true"
      className="h-screen w-full overflow-y-auto overflow-x-hidden"
    >
      <div className="mx-auto grid min-h-full w-full max-w-360 grid-cols-1 sm:grid-cols-[70px_minmax(0,1fr)] md:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[250px_minmax(0,1fr)_450px]">
        <nav className="hidden sm:block sticky top-0 h-screen self-start">
          {leftSidebar}
        </nav>

        <div className="min-h-full min-w-0">
          <TopNav scrollRef={scrollRef} />
          <main>{children}</main>
          {/* <MobileNavBar scrollRef={scrollRef} /> */}
        </div>

        <aside className="hidden lg:block sticky top-0 h-screen self-start">
          {rightSidebar}
        </aside>
      </div>
    </div>
  );
};

export default Main;
