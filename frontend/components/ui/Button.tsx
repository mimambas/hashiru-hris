"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cx } from "@/lib/format";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-control text-sm font-medium",
    "transition-[background-color,color,transform,box-shadow] duration-150",
    "active:scale-[0.96]",
    "disabled:pointer-events-none disabled:opacity-50",
    // focus ring memakai token global :focus-visible (2px accent)
  ].join(" "),
  {
    variants: {
      variant: {
        // Satu tombol primer terisi per tampilan (DESIGN.md §2).
        default: "bg-accent text-white hover:bg-accent-hover shadow-sm",
        secondary: "bg-muted text-text hover:bg-border",
        outline: "border border-border bg-surface text-text hover:bg-muted",
        ghost: "text-text hover:bg-muted",
        destructive: "bg-danger text-white hover:bg-danger/90 shadow-sm",
      },
      size: {
        sm: "h-9 px-3 text-[13px] min-w-9",
        default: "h-10 px-4 min-w-10",
        lg: "h-11 px-6 min-w-11",
        icon: "h-10 w-10",
        "icon-sm": "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cx(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
