import * as React from "react";

import { cn } from "@/lib/utils";

/** Minimal date picker — full calendar UI ships on deploy branches. */
export function Calendar({
  selected,
  onSelect,
  className,
}: {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
}) {
  const value = selected ? selected.toISOString().slice(0, 10) : "";
  return (
    <input
      type="date"
      className={cn(
        "rounded-md border border-gray-300 px-3 py-2 text-sm w-full",
        className,
      )}
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        onSelect?.(v ? new Date(v + "T12:00:00") : undefined);
      }}
    />
  );
}
