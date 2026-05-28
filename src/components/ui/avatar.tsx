import * as React from "react";

import { cn } from "@/lib/utils";

export function Avatar({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AvatarImage({
  src,
  alt,
  className,
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt ?? ""}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

export function AvatarFallback({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("text-sm font-medium text-gray-600", className)}>
      {children}
    </span>
  );
}
