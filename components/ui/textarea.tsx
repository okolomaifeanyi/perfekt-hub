import * as React from "react";

import { TEXTAREA_BASE_CLASS } from "@/lib/textarea-style.mjs";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(TEXTAREA_BASE_CLASS, className)}
      {...props}
    />
  );
}

export { Textarea };
