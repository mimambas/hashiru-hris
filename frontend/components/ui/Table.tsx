"use client";

import * as React from "react";
import { cx } from "@/lib/format";

/**
 * Tabel data (DESIGN.md §4):
 * - header sticky, tanpa zebra — gunakan hover row
 * - kolom angka rata kanan + tabular-nums
 */
const TableWrapper = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cx("w-full overflow-x-auto", className)} {...props} />
  ),
);
TableWrapper.displayName = "TableWrapper";

const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <table ref={ref} className={cx("w-full text-sm", className)} {...props} />
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cx("sticky top-0 bg-surface", className)} {...props} />
  ),
);
TableHeader.displayName = "TableHeader";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }
>(({ className, numeric, ...props }, ref) => (
  <th
    ref={ref}
    scope="col"
    className={cx(
      "border-b border-border px-4 py-3 text-[13px] font-medium text-text-secondary",
      numeric ? "text-right tnum" : "text-left",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={className} {...props} />,
);
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cx(
        "border-b border-border last:border-0 transition-colors duration-150 hover:bg-muted/60",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }
>(({ className, numeric, ...props }, ref) => (
  <td
    ref={ref}
    className={cx("px-4 py-3 text-text", numeric && "text-right tnum", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

export { TableWrapper, Table, TableHeader, TableHead, TableBody, TableRow, TableCell };
