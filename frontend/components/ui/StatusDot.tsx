"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cx } from "@/lib/format";

const statusDotVariants = cva("inline-block h-2 w-2 shrink-0 rounded-full", {
  variants: {
    variant: {
      success: "bg-success",
      warning: "bg-warning",
      danger: "bg-danger",
      info: "bg-info",
      neutral: "bg-text-tertiary",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export interface StatusDotProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusDotVariants> {
  label: string;
}

/** Indikator status kecil: titik warna + teks (selalu berpasangan). */
function StatusDot({ className, variant, label, ...props }: StatusDotProps) {
  return (
    <span className={cx("inline-flex items-center gap-2 text-sm text-text", className)} {...props}>
      <span className={cx(statusDotVariants({ variant }))} aria-hidden />
      {label}
    </span>
  );
}

export { StatusDot };
