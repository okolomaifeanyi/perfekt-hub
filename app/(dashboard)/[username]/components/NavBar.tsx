import { ReactNode } from "react";
import Back from "./Back";
import { H1 } from "@/components/Typography";

const NavBar = ({
  title,
  extra,
  avatar,
}: {
  title: string;
  extra?: ReactNode;
  avatar?: ReactNode;
}) => {
  return (
    <div className="py-2 sticky top-0 flex justify-between items-center z-10 bg-background px-2 gap-x-2">
      <div className="flex items-center space-x-2">
        <Back />

        {avatar && avatar}
        <H1 className="text-lg">{title}</H1>
      </div>

      {extra && extra}
    </div>
  );
};

export default NavBar;
