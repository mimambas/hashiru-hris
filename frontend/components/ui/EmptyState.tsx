"use client";

import * as React from "react";
import { Inbox } from "lucide-react";
import { cx } from "@/lib/format";
import { Button } from "./Button";

/**
 * Empty state (DESIGN.md §4): ikon netral + 1 kalimat + 1 aksi.
 */
function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      <div
        className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-text-tertiary"
        aria-hidden
      >
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <p className="text-sm font-medium text-text">{title}</p>
      {description && <p className="max-w-sm text-[13px] text-text-secondary">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export { EmptyState };
