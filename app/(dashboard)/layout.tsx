import Aside from "@/components/Aside";
import Main from "@/components/Main";
import NavBar from "@/components/NavBar";
import { ReactNode } from "react";

const layout = ({ children }: { children: ReactNode }) => {
  return (
    <Main leftSidebar={<NavBar />} rightSidebar={<Aside />}>
      {children}
    </Main>
  );
};

export default layout;
