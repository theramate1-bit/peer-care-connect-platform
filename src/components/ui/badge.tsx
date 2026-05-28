import * as React from "react";

import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "outline";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "secondary" && "bg-gray-100 text-gray-800",
        variant === "outline" && "border border-gray-300 text-gray-700",
        variant === "default" && "bg-blue-100 text-blue-800",
        className,
      )}
      {...props}
    />
  );
}
