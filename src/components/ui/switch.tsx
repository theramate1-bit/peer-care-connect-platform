import * as React from "react";

import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { checked?: boolean }
>(({ className, checked, onChange, ...props }, ref) => (
  <input
    type="checkbox"
    role="switch"
    ref={ref}
    checked={checked}
    onChange={onChange}
    className={cn("h-5 w-9 accent-blue-600", className)}
    {...props}
  />
));
Switch.displayName = "Switch";
