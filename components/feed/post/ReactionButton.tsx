import { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shared button used for every reaction-style action (like/dislike/
// comment/reply/quote/share) on both posts and curated content — the
// default elevated shadcn Button chrome (secondary/outline background),
// not a bare flat icon. hoverClass/activeClass take full literal Tailwind
// classes (not composed at runtime) since Tailwind's JIT scanner needs to
// see the complete class string to generate it.
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
    <Button
      ref={ref}
      type="button"
      size="sm"
      variant={active ? "outline" : "secondary"}
      aria-label={label}
      title={label}
      className={cn("gap-1", hoverClass, active && activeClass, className)}
      {...props}
    >
      <Icon size={16} fill={active ? "currentColor" : "none"} />
      {count > 0 && <span>{count}</span>}
    </Button>
  );
});
