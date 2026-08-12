import { ReactNode } from "react";
import Back from "./Back";

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
        <h1 className="text-lg font-bold">{title}</h1>
      </div>

      {extra && extra}
    </div>
  );
};

export default NavBar;
