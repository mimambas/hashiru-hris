"use client";

import * as React from "react";
import { cx } from "@/lib/format";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
  className?: string;
  style?: React.CSSProperties;
}

const toneIconBg: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "bg-muted text-text-secondary",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success-text",
  warning: "bg-warning-soft text-warning-text",
  danger: "bg-danger-soft text-danger-text",
  info: "bg-info-soft text-info-text",
};

/** Kartu KPI: label + angka tabular-nums + hint + ikon. */
function StatCard({ label, value, hint, icon, tone = "neutral", className, style }: StatCardProps) {
  return (
    <div
      className={cx("rounded-card border border-border bg-surface p-5", className)}
      style={style}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-text-secondary">{label}</p>
        {icon && (
          <span
            className={cx(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-control",
              toneIconBg[tone],
            )}
            aria-hidden
          >
            {icon}
          </span>
        )}
      </div>
      <p className="tnum mt-2 truncate text-2xl font-semibold tracking-tight text-text" title={value}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-text-tertiary">{hint}</p>}
    </div>
  );
}

export { StatCard };
