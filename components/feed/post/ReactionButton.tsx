import { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared compact icon-row button used by post reactions (like/dislike/
// reply/quote/share) — same visual language as curated content's ActionBar
// (see components/feed/CuratedContentDisplay.tsx) so both look like one
// design system instead of two. hoverClass/activeClass take full literal
// Tailwind classes (not composed at runtime) since Tailwind's JIT scanner
// needs to see the complete class string to generate it.
export const ReactionButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: LucideIcon;
    count?: number;
    active?: boolean;
    hoverClass: string;
    activeClass: string;
    label: string;
  }
>(function ReactionButton(
  { icon: Icon, count = 0, active, hoverClass, activeClass, label, className, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground transition",
        hoverClass,
        active && activeClass,
        className
      )}
      {...props}
    >
      <Icon size={14} fill={active ? "currentColor" : "none"} />
      {count > 0 && <span>{count}</span>}
    </button>
  );
});
