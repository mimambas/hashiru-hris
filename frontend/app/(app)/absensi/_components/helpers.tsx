"use client";

import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

/* ---------------- Meta status absensi ---------------- */

export interface AttendanceMeta {
  label: string;
  variant: BadgeProps["variant"];
  /** Kelas warna sel grid ringkasan tim */
  cellClass: string;
  code: string;
}

export const ATTENDANCE_META: Record<string, AttendanceMeta> = {
  present: {
    label: "Hadir",
    variant: "success",
    cellClass: "bg-success text-white",
    code: "H",
  },
  late: {
    label: "Terlambat",
    variant: "warning",
    cellClass: "bg-warning text-white",
    code: "T",
  },
  early_leave: {
    label: "Pulang cepat",
    variant: "warning",
    cellClass: "bg-warning text-white",
    code: "PC",
  },
  absent: {
    label: "Absen",
    variant: "danger",
    cellClass: "bg-danger text-white",
    code: "A",
  },
  wfh: {
    label: "WFH",
    variant: "info",
    cellClass: "bg-info text-white",
    code: "W",
  },
  leave: {
    label: "Cuti",
    variant: "neutral",
    cellClass: "bg-text-tertiary/60 text-white",
    code: "C",
  },
  holiday: {
    label: "Libur",
    variant: "neutral",
    cellClass: "bg-text-tertiary/40 text-text-secondary",
    code: "L",
  },
};

export function attendanceMeta(status: string | null | undefined): AttendanceMeta {
  const key = (status ?? "").toLowerCase();
  return (
    ATTENDANCE_META[key] ?? {
      label: status ? status : "—",
      variant: "neutral" as const,
      cellClass: "bg-muted text-text-tertiary",
      code: "–",
    }
  );
}

export function AttendanceBadge({ status }: { status: string | null | undefined }) {
  const meta = attendanceMeta(status);
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

/* ---------------- Jam "HH.MM" ---------------- */

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ---------------- Tanggal ---------------- */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Daftar tanggal ISO dari `from` s.d. `to` (inklusif), dibatasi 31 hari. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard < 31) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}

/* ---------------- Blok error standar ---------------- */

export function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-card border border-border bg-surface px-6 py-12 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger-text">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-medium text-text">Gagal memuat data</p>
        <p className="mt-1 max-w-sm text-[13px] text-text-secondary">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Muat ulang
      </Button>
    </div>
  );
}
