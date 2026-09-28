"use client";

import * as React from "react";
import { cx } from "@/lib/format";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Bentuk skeleton: block, teks baris, atau lingkaran. */
  shape?: "block" | "text" | "circle";
}

/** Placeholder loading dengan shimmer halus. */
function Skeleton({ className, shape = "block", ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cx(
        "animate-pulse bg-muted",
        shape === "block" && "rounded-control",
        shape === "text" && "h-4 rounded",
        shape === "circle" && "rounded-full",
        className,
      )}
      {...props}
    />
  );
}

/** Skeleton kartu KPI standar. */
function StatCardSkeleton() {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="flex items-start justify-between">
        <Skeleton shape="text" className="w-24" />
        <Skeleton shape="circle" className="h-9 w-9" />
      </div>
      <Skeleton shape="text" className="mt-3 h-7 w-32" />
      <Skeleton shape="text" className="mt-2 w-20" />
    </div>
  );
}

export { Skeleton, StatCardSkeleton };
