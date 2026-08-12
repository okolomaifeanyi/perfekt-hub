"use client";

import { Label } from "@/components/ui/label";
import { useDataSaverStore } from "@/lib/store/useDataSaverStore";
import { cn } from "@/lib/utils";

const fieldId = "data-saver-toggle";
const descriptionId = `${fieldId}-description`;

export function DataSaverCard() {
  const dataSaverEnabled = useDataSaverStore(state => state.dataSaverEnabled);
  const setDataSaverEnabled = useDataSaverStore(state => state.setDataSaverEnabled);

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor={fieldId} className="text-base">
            Data Saver
          </Label>
          <p id={descriptionId} className="text-sm text-muted-foreground">
            Images and videos won&apos;t autoplay or download automatically —
            you&apos;ll see a blurred preview with a tap-to-load button
            instead.
          </p>
        </div>

        <button
          id={fieldId}
          type="button"
          role="switch"
          aria-checked={dataSaverEnabled}
          aria-describedby={descriptionId}
          onClick={() => setDataSaverEnabled(!dataSaverEnabled)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            dataSaverEnabled ? "bg-primary" : "bg-input"
          )}
        >
          <span
            className={cn(
              "inline-block size-4 transform rounded-full bg-background shadow transition-transform",
              dataSaverEnabled ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>
    </section>
  );
}
