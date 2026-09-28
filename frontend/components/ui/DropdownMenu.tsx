"use client";

import * as React from "react";
import { cx } from "@/lib/format";

/**
 * DropdownMenu sederhana: trigger + daftar item.
 * - Esc menutup, klik di luar menutup, panah atas/bawah navigasi.
 */
interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  label?: string;
}

function DropdownMenu({ trigger, children, align = "right", label }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open ]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={cx(
            "absolute z-50 mt-2 min-w-48 rounded-control border border-border bg-surface p-1 shadow-lg",
            "animate-fade-slide-in",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  danger?: boolean;
}

const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ className, danger, ...props }, ref) => (
    <button
      ref={ref}
      role="menuitem"
      className={cx(
        "flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm",
        "transition-colors duration-150",
        danger ? "text-danger hover:bg-danger-soft" : "text-text hover:bg-muted",
        className,
      )}
      {...props}
    />
  ),
);
DropdownMenuItem.displayName = "DropdownMenuItem";

export { DropdownMenu, DropdownMenuItem };
