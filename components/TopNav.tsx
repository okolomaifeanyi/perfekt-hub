"use client";

import { appInfo } from "@/lib/appInfo";
import { Button } from "./ui/button";
import { Menu, Search } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RefObject } from "react";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";

const TopNav = ({
  scrollRef,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
}) => {
  const hidden = useHideOnScroll(scrollRef);
  {
  }

  return (
    <motion.nav
      initial={false}
      animate={{ y: hidden ? "-100%" : "0%" }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="sm:hidden z-50 flex justify-between items-center px-4 h-12 sticky top-0 left-0 right-0 bg-card/90 backdrop-blur-lg border-b shadow-sm"
    >
      <Link href="/" className="text-primary font-bold">
        {appInfo.name}
      </Link>

      <div className="flex gap-2">
        <Button variant="secondary" size="icon">
          <Search className="h-5 w-5" />
        </Button>
        <Button variant="secondary" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </motion.nav>
  );
};

export default TopNav;
