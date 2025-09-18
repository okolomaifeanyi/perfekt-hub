import Aside from "@/components/Aside";
import Main from "@/components/Main";
import NavBar from "@/components/NavBar";
import { ReactNode } from "react";

const layout = ({children}: {children: ReactNode}) => {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-[70px_1fr] md:grid-cols-[200px_1fr] lg:grid-cols-[250px_1fr_250px] h-screen max-w-full overflow-x-hidden">
        {/* Left Sidebar */}
        <nav className="hidden sm:block sticky top-0 h-screen overflow-y-auto scrollbar-hide">
          <NavBar />
        </nav>

        <Main>{children}</Main>

        {/* Right Sidebar */}
        <aside className="hidden lg:block sticky top-0 h-screen overflow-y-auto scrollbar-hide">
          <Aside />
        </aside>
      </div>
    </>
  );
};

export default layout;
