"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Hourglass, ImageOff, XCircle } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { cx } from "@/lib/format";
import { expenseTypeLabel, type ExpenseItem, type RawRow } from "./types";

/* ---------------- Normalisasi defensif ---------------- */

export function pickNumber(obj: RawRow, keys: string[]): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return 0;
}

export function pickString(obj: RawRow, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return "";
}

/** Terima array polos maupun {items:[...]} / {data:[...]} / {results:[...]}. */
export function asRows(raw: unknown): RawRow[] {
  if (Array.isArray(raw)) return raw as RawRow[];
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    for (const k of ["items", "data", "results"]) {
      if (Array.isArray(r[k])) return r[k] as RawRow[];
    }
  }
  return [];
}

export function normalizeExpense(r: RawRow): ExpenseItem {
  const nested = (r.employee ?? r.claimant ?? r.user) as RawRow | null;
  return {
    id: pickString(r, ["id", "expense_id", "uuid"]) || String(pickNumber(r, ["id"])),
    claim_date: pickString(r, ["claim_date", "claimDate", "date", "expense_date"]) || null,
    type: pickString(r, ["type", "expense_type", "category"]) || "other",
    amount: pickNumber(r, ["amount", "nominal", "total", "value"]),
    description: pickString(r, ["description", "desc", "notes", "keterangan"]) || null,
    receipt_url:
      pickString(r, ["receipt_url", "receiptUrl", "receipt", "attachment_url", "file_url"]) || null,
    status: pickString(r, ["status", "state"]) || "pending",
    rejection_reason:
      pickString(r, ["rejection_reason", "reject_reason", "reason", "rejected_reason"]) || null,
    employee_name:
      (nested && typeof nested === "object"
        ? pickString(nested, ["full_name", "name", "employee_name"])
        : "") ||
      pickString(r, ["employee_name", "full_name", "claimant_name", "requester_name"]) ||
      null,
    created_at: pickString(r, ["created_at", "createdAt", "submitted_at"]) || null,
  };
}

/* ---------------- Badge status klaim ---------------- */

const STATUS_META: Record<string, { label: string; variant: BadgeProps["variant"]; Icon: typeof Hourglass }> = {
  pending: { label: "Menunggu", variant: "warning", Icon: Hourglass },
  approved: { label: "Disetujui", variant: "success", Icon: CheckCircle2 },
  rejected: { label: "Ditolak", variant: "danger", Icon: XCircle },
};

export function ExpenseStatusBadge({ status }: { status: string | null | undefined }) {
  const key = (status ?? "").toLowerCase();
  const meta = STATUS_META[key] ?? {
    label: status ? status : "Tidak diketahui",
    variant: "neutral" as const,
    Icon: Hourglass,
  };
  const Icon = meta.Icon;
  return (
    <Badge variant={meta.variant}>
      <Icon className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
      {meta.label}
    </Badge>
  );
}

/* ---------------- Field form: label + error di bawah ---------------- */

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
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
            {" *"}
          </span>
        )}
      </Label>
      {React.cloneElement(children as React.ReactElement, {
        id: htmlFor,
        invalid: error ? true : undefined,
        "aria-describedby": [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined,
      })}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-text-tertiary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-[13px] text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
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
        <p className="mt-1 text-[13px] text-text-secondary">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Muat ulang
      </Button>
    </div>
  );
}

/* ---------------- Pratinjau struk ---------------- */

/**
 * Tampilkan <img> bila URL tampak seperti gambar; selain itu tampilkan
 * tautan "Lihat struk". Bila gambar gagal dimuat, ganti ke tautan.
 */
export function ReceiptPreview({
  url,
  size = "md",
}: {
  url: string | null | undefined;
  size?: "sm" | "md";
}) {
  const [imgFailed, setImgFailed] = React.useState(false);
  if (!url) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] text-text-tertiary">
        <ImageOff className="h-4 w-4" aria-hidden />
        Tidak ada struk
      </span>
    );
  }
  const looksImage = /\.(jpe?g|png|gif|webp)(\?|#|$)/i.test(url);
  const imgClass =
    size === "sm"
      ? "h-16 w-16 rounded-control border border-border object-cover"
      : "max-h-64 w-full rounded-control border border-border object-contain bg-muted/50";
  if (looksImage && !imgFailed) {
    return (
      <a href={url} target="_blank" rel="noreferrer" title="Buka struk di tab baru">
        <img
          src={url}
          alt="Pratinjau struk"
          className={cx(imgClass, "hover:opacity-90")}
          onError={() => setImgFailed(true)}
          loading="lazy"
        />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
    >
      <ExternalLink className="h-4 w-4" aria-hidden />
      Lihat struk
    </a>
  );
}

/** Re-export label tipe agar halaman tidak perlu impor ganda. */
export { expenseTypeLabel };
