"use client";

import * as React from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Circle,
  CircleDashed,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { documentCategoryLabel, type DocumentItem, type RawRow } from "./types";

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

function pickBool(obj: RawRow, keys: string[]): boolean {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (["true", "1", "yes", "verified"].includes(s)) return true;
      if (["false", "0", "no", "unverified", "pending"].includes(s)) return false;
    }
    if (typeof v === "number") return v !== 0;
  }
  return false;
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

/** Ambil ekstensi dari nama file atau tipe MIME. */
export function extOf(name: string | null | undefined, mime?: string | null): string | null {
  if (name) {
    const m = /\.([a-z0-9]{2,5})(?:[?#]|$)/i.exec(name.trim());
    if (m) return m[1].toLowerCase();
  }
  if (mime) {
    const map: Record<string, string> = {
      "application/pdf": "pdf",
      "image/jpeg": "jpg",
      "image/png": "png",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    };
    if (map[mime]) return map[mime];
  }
  return null;
}

export function normalizeDocument(r: RawRow): DocumentItem {
  const nested = (r.employee ?? r.owner ?? r.uploader) as RawRow | null;
  const name = pickString(r, ["name", "filename", "file_name", "title", "document_name"]);
  const mime = pickString(r, ["mime_type", "mimetype", "content_type", "file_type"]);
  return {
    id: pickString(r, ["id", "document_id", "uuid"]) || String(pickNumber(r, ["id"])),
    name: name || "Dokumen tanpa nama",
    employee_name:
      (nested && typeof nested === "object"
        ? pickString(nested, ["full_name", "name", "employee_name"])
        : "") ||
      pickString(r, ["employee_name", "full_name", "owner_name", "uploaded_by_name"]) ||
      null,
    category: pickString(r, ["category", "kategori", "doc_category"]) || "personal",
    file_ext:
      extOf(name, mime) ??
      (mime && /^[a-z0-9]+$/i.test(mime) ? mime.toLowerCase() : null),
    expiry_date: pickString(r, ["expiry_date", "expires_at", "valid_until", "expiry"]) || null,
    verified: pickBool(r, ["verified", "is_verified", "verification_status"]),
    file_url: pickString(r, ["file_url", "url", "path", "download_url"]) || null,
  };
}

/* ---------------- Badge status verifikasi ---------------- */

export function VerificationBadge({ verified }: { verified: boolean }) {
  const Icon = verified ? BadgeCheck : CircleDashed;
  return (
    <Badge variant={verified ? "success" : "neutral"}>
      <Icon className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
      {verified ? "Terverifikasi" : "Belum diverifikasi"}
    </Badge>
  );
}

/* ---------------- Badge kedaluwarsa ---------------- */

/** Kembalikan "expired" | "soon" | "ok" | null (null = tidak ada tanggal). */
export function expiryState(expiry: string | null | undefined): "expired" | "soon" | "ok" | null {
  if (!expiry) return null;
  const d = new Date(expiry);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "soon";
  return "ok";
}

export function ExpiryBadge({ state }: { state: "expired" | "soon" | null }) {
  if (state === "expired") {
    return (
      <Badge variant="danger">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
        Kedaluwarsa
      </Badge>
    );
  }
  if (state === "soon") {
    return (
      <Badge variant="warning">
        <Circle className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
        Segera kedaluwarsa
      </Badge>
    );
  }
  return null;
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
        "aria-describedby":
          [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined,
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

/** Re-export label kategori agar halaman tidak perlu impor ganda. */
export { documentCategoryLabel };
