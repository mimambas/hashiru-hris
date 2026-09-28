"use client";

import * as React from "react";
import { cx } from "@/lib/format";

/**
 * Tooltip sederhana: muncul saat hover/fokus.
 * Untuk teks penting yang terpotong (line-clamp/ellipsis).
 */
function Tooltip({
  content,
  children,
  className,
}: {
  content: React.ReactNode;
  children: React.ReactElement;
  className?: string;
}) {
  const [visible, setVisible] = React.useState(false);
  const id = React.useId();

  return (
    <span
      className={cx("relative inline-flex", className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {React.cloneElement(children, { "aria-describedby": visible ? id : undefined })}
      {visible && (
        <span
          id={id}
          role="tooltip"
          className={cx(
            "pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2",
            "max-w-64 rounded-control border border-border bg-surface px-2.5 py-1.5",
            "text-xs text-text shadow-lg",
            "animate-fade-slide-in",
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

export { Tooltip };
