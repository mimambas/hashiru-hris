"use client";

import * as React from "react";
import { AlertTriangle, Circle, CircleCheck, CircleX, Hourglass } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import type { Role } from "@/lib/auth";

/** Peran dengan hak akses HR penuh atas data karyawan. */
export const HR_ROLES: Role[] = ["super_admin", "hr_director", "hr_manager", "hr_officer"];

/* ---------------- Badge status karyawan ---------------- */

const STATUS_META: Record<string, { label: string; variant: BadgeProps["variant"]; Icon: typeof Circle }> = {
  active: { label: "Aktif", variant: "success", Icon: CircleCheck },
  probation: { label: "Masa percobaan", variant: "warning", Icon: Hourglass },
  inactive: { label: "Nonaktif", variant: "neutral", Icon: Circle },
  terminated: { label: "Berhenti", variant: "danger", Icon: CircleX },
  resigned: { label: "Mengundurkan diri", variant: "danger", Icon: CircleX },
};

export function EmployeeStatusBadge({ status }: { status: string | null | undefined }) {
  const key = (status ?? "").toLowerCase();
  const meta = STATUS_META[key] ?? {
    label: status ? capitalize(status) : "Tidak diketahui",
    variant: "neutral" as const,
    Icon: Circle,
  };
  const Icon = meta.Icon;
  return (
    <Badge variant={meta.variant}>
      <Icon className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
      {meta.label}
    </Badge>
  );
}

function capitalize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ---------------- Label bantu ---------------- */

export function employmentStatusLabel(value: string | null | undefined): string {
  switch ((value ?? "").toLowerCase()) {
    case "permanent":
      return "Tetap";
    case "contract":
      return "Kontrak";
    case "outsourcing":
      return "Alih daya";
    default:
      return value ? capitalize(value) : "—";
  }
}

export function genderLabel(value: string | null | undefined): string {
  const v = (value ?? "").toLowerCase();
  if (v === "male" || v === "l" || v === "laki-laki") return "Laki-laki";
  if (v === "female" || v === "p" || v === "perempuan") return "Perempuan";
  return value ?? "—";
}

/* ---------------- Blok error standar ---------------- */

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
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

/* ---------------- Validasi NIK / NPWP ---------------- */

const NIK_RE = /^\d{16}$/;
/** NPWP 15 digit, boleh dengan format 12.345.678.9-012.345 */
const NPWP_DIGITS_RE = /^\d{15}$/;

export function validateNik(value: string): string | null {
  const v = value.trim();
  if (!v) return "NIK wajib diisi";
  if (!NIK_RE.test(v)) return "NIK harus tepat 16 digit angka";
  return null;
}

export function validateNpwp(value: string): string | null {
  const v = value.trim();
  if (!v) return null; // opsional
  const digits = v.replace(/\D/g, "");
  if (!NPWP_DIGITS_RE.test(digits))
    return "NPWP harus 15 digit angka, contoh 12.345.678.9-012.345";
  return null;
}

/** Format tampilan NPWP: 12.345.678.9-012.345 */
export function formatNpwp(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length !== 15) return value ?? "—";
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}.${digits.slice(8, 9)}-${digits.slice(9, 12)}.${digits.slice(12)}`;
}

/* ---------------- Field form ---------------- */

export function Field({
  label,
  htmlFor,
  required,
  error,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;
  return (
    <div>
      <Label htmlFor={htmlFor} className="mb-1.5">
        {label}
        {required && (
          <span className="text-danger" aria-hidden>
            {" "}
            *
          </span>
        )}
      </Label>
      {React.cloneElement(children as React.ReactElement, {
        id: htmlFor,
        invalid: error ? true : undefined,
        "aria-describedby": [error ? errorId : null, hint ? hintId : null]
          .filter(Boolean)
          .join(" ") || undefined,
      })}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-text-tertiary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
