"use client";

import * as React from "react";
import { cx } from "@/lib/format";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Tampilkan state invalid: border danger + aria-invalid. */
  invalid?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cx(
        "flex h-10 w-full rounded-control border bg-surface px-3",
        // 16px di mobile mencegah zoom iOS (DESIGN.md §3), 14px di desktop
        "text-base sm:text-sm text-text",
        "placeholder:text-text-tertiary",
        "transition-[border-color,box-shadow] duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
        invalid
          ? "border-danger"
          : "border-border hover:border-text-tertiary",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
