"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "@/lib/format";

/** Select native yang di-style (aksesibilitas penuh keyboard & screen reader). */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(
          "flex h-10 w-full appearance-none rounded-control border bg-surface pl-3 pr-9",
          "text-base sm:text-sm text-text",
          "transition-[border-color] duration-150",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
          invalid
            ? "border-danger"
            : "border-border hover:border-text-tertiary",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
        aria-hidden
      />
    </div>
  ),
);
Select.displayName = "Select";

export { Select };
