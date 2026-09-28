"use client";

import * as React from "react";
import { BadgeCheck, Calculator, CheckCircle2, FileEdit } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

/**
 * Badge status run payroll: selalu ikon + teks (DESIGN.md §2).
 * draft=Draf (neutral), calculated=Terkalkulasi (info),
 * approved=Disetujui (warning), paid=Dibayar (success).
 */
const META: Record<
  string,
  { label: string; variant: "neutral" | "info" | "warning" | "success"; icon: React.ReactNode }
> = {
  draft: {
    label: "Draf",
    variant: "neutral",
    icon: <FileEdit className="h-3 w-3" aria-hidden />,
  },
  calculated: {
    label: "Terkalkulasi",
    variant: "info",
    icon: <Calculator className="h-3 w-3" aria-hidden />,
  },
  approved: {
    label: "Disetujui",
    variant: "warning",
    icon: <CheckCircle2 className="h-3 w-3" aria-hidden />,
  },
  paid: {
    label: "Dibayar",
    variant: "success",
    icon: <BadgeCheck className="h-3 w-3" aria-hidden />,
  },
};

export function RunStatusBadge({ status }: { status: string }) {
  const key = (status ?? "").toLowerCase();
  const meta = META[key] ?? {
    label: status || "Tidak diketahui",
    variant: "neutral" as const,
    icon: null,
  };
  return (
    <Badge variant={meta.variant}>
      {meta.icon}
      {meta.label}
    </Badge>
  );
}
