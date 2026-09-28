"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";

/* ---------------- Label tipe cuti ---------------- */

const LEAVE_TYPE_LABEL: Record<string, string> = {
  AL: "Cuti tahunan",
  SL: "Cuti sakit",
  PL: "Cuti pribadi",
  ML: "Cuti melahirkan",
  PT: "Cuti ayah",
  BL: "Cuti duka cita",
  MR: "Cuti menikah",
  HJ: "Cuti haji",
  UL: "Cuti tanpa gaji",
  CB: "Cuti bersama",
};

export function leaveTypeLabel(code: string | null | undefined): string {
  const c = (code ?? "").toUpperCase();
  return LEAVE_TYPE_LABEL[c] ?? code ?? "—";
}

/* ---------------- Status pengajuan ---------------- */

const LEAVE_STATUS_META = {
  pending: { label: "Menunggu", variant: "warning" as const },
  approved: { label: "Disetujui", variant: "success" as const },
  rejected: { label: "Ditolak", variant: "danger" as const },
  cancelled: { label: "Dibatalkan", variant: "neutral" as const },
};

export function LeaveStatusBadge({ status }: { status: string | null | undefined }) {
  const key = (status ?? "").toLowerCase();
  const meta = LEAVE_STATUS_META[key as keyof typeof LEAVE_STATUS_META] ?? {
    label: status ?? "—",
    variant: "neutral" as const,
  };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

/* ---------------- Urgensi ---------------- */

export function isUrgent(startDate: string | null | undefined, status: string): boolean {
  if (status !== "pending" || !startDate) return false;
  const start = new Date(`${startDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(start.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((start.getTime() - today.getTime()) / 86400000);
  return diffDays >= 0 && diffDays <= 3;
}

export function UrgencyBadge() {
  return <Badge variant="danger">Mendesak</Badge>;
}

/* ---------------- Tanggal & hari kerja ---------------- */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Jumlah hari kerja (Senin–Jumat) di rentang inklusif. */
export function countWorkingDays(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** True bila dua rentang tanggal bersinggungan. */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function formatRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start || !end) return "—";
  return `${formatDate(start)} – ${formatDate(end)}`;
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
