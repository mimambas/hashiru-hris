"use client";

import * as React from "react";
import { cx } from "@/lib/format";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Inisial dari nama; outline 1px halus (better-ui). */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const [failed, setFailed] = React.useState(false);
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
  } as const;

  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "bg-accent-soft font-semibold text-accent",
        "outline outline-1 outline-black/10 dark:outline-white/10",
        sizes[size],
        className,
      )}
      role="img"
      aria-label={name}
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        <span aria-hidden>{initialsOf(name)}</span>
      )}
    </span>
  );
}

export { Avatar };
