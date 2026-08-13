import { ReactNode } from "react";
import Back from "./Back";

const NavBar = ({
  title,
  extra,
  avatar,
  backHref,
}: {
  title: string;
  extra?: ReactNode;
  avatar?: ReactNode;
  // Defaults to router.back() (via Back), which is unreliable when a page
  // can be landed on directly (e.g. a message conversation opened from a
  // notification, with no "came from the list" history entry). Pass an
  // explicit href for pages where "back" should always mean one specific
  // place regardless of how the user got here.
  backHref?: string;
}) => {
  return (
    // TopNav (mobile-only) is sticky at top-0 with z-50 in this same scroll
    // container — sticking this at top-0 too meant it lost that fight and
    // rendered underneath TopNav (including its Back button) once scrolled
    // past its natural position. top-12 matches TopNav's h-12 so this sticks
    // just below it on mobile instead of competing for the same spot.
    <div className="py-2 sticky top-12 sm:top-0 flex justify-between items-center z-10 bg-background px-2 gap-x-2">
      <div className="flex items-center space-x-2">
        <Back href={backHref} />

        {avatar && avatar}
        <h1 className="text-lg font-bold">{title}</h1>
      </div>

      {extra && extra}
    </div>
  );
};

export default NavBar;
