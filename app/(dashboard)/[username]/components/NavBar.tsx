import React from "react";
import Back from "./Back";


const NavBar = ({ title }: { title: string }) => {
  return (
    <div className="p-2 flex space-x-1.5 items-center">
      <Back />

      <strong>{title}</strong>
    </div>
  );
};

export default NavBar;
