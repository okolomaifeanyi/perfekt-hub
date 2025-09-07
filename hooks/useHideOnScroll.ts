import { RefObject, useState } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";

export function useHideOnScroll(
  container: RefObject<HTMLElement | null>,
  offset: number = 50
) {
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll({ container });

  useMotionValueEvent(scrollY, "change", latest => {
    const prev = scrollY.getPrevious() ?? 0;
    if (latest > prev && latest > offset) setHidden(true);
    else if (latest < prev) setHidden(false);
  });

  return hidden;
}
