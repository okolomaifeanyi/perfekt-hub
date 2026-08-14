import { ReactNode } from "react";
import Back from "./Back";

const NavBar = ({
  title,
  extra,
  avatar,
  backHref,
  hideBackOnDesktop,
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
  // Set for pages where the "back" destination is already permanently
  // visible in the lg+ sidebar (e.g. the conversation list on /messages,
  // via Aside's MessagesAside) — there, clicking Back at desktop width
  // navigates to a page that immediately redirects right back into a
  // conversation (see InboxPage's isDesktopTwoPane effect), so the button
  // just appears broken. Hiding it at the same `lg` breakpoint the sidebar
  // appears at removes the dead click instead of fighting the redirect.
  hideBackOnDesktop?: boolean;
}) => {
  return (
    // TopNav (mobile-only) is sticky at top-0 with z-50 in this same scroll
    // container — sticking this at top-0 too meant it lost that fight and
    // rendered underneath TopNav (including its Back button) once scrolled
    // past its natural position. top-12 matches TopNav's h-12 so this sticks
    // just below it on mobile instead of competing for the same spot.
    <div className="py-2 sticky top-12 sm:top-0 flex justify-between items-center z-10 bg-background px-2 gap-x-2">
      <div className="flex items-center space-x-2">
        <Back href={backHref} className={hideBackOnDesktop ? "lg:hidden" : undefined} />

        {avatar && avatar}
        <h1 className="text-lg font-bold">{title}</h1>
      </div>

      {extra && extra}
    </div>
  );
};

export default NavBar;
