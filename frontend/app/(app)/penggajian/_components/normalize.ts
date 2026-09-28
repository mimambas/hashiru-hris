"use client";

/**
 * Helper normalisasi defensif untuk modul penggajian.
 * Bentuk respons API bisa bervariasi (array langsung atau {items:[...]}),
 * jadi semua pembacaan field mencoba beberapa varian key.
 */

export interface RawRow {
  [key: string]: unknown;
}

/** Validasi format periode "YYYY-MM". */
export const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function pickNumber(obj: RawRow | null | undefined, keys: string[]): number {
  if (!obj) return 0;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return 0;
}

/** Alias sesuai kontrak tugas: num(obj, keys[]). */
export function num(obj: unknown, keys: string[]): number {
  if (!obj || typeof obj !== "object") return 0;
  return pickNumber(obj as RawRow, keys);
}

export function pickString(obj: RawRow | null | undefined, keys: string[]): string {
  if (!obj) return "";
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return "";
}

export function asRows(raw: unknown): RawRow[] {
  if (Array.isArray(raw)) return raw as RawRow[];
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    for (const k of ["data", "items", "results", "runs"]) {
      if (Array.isArray(r[k])) return r[k] as RawRow[];
    }
  }
  return [];
}

/** Deteksi run THR dari berbagai kemungkinan penanda. */
export function isThrRun(row: RawRow): boolean {
  const typeVal = pickString(row, ["type", "kind", "run_type", "payroll_type"]).toLowerCase();
  if (typeVal.includes("thr")) return true;
  for (const k of ["is_thr", "thr"]) {
    const v = row[k];
    if (v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true") return true;
  }
  const name = pickString(row, ["name", "title", "label"]).toLowerCase();
  if (name.includes("thr")) return true;
  return false;
}

/** Periode "YYYY-MM" → status lowercase. */
export function runStatus(row: RawRow): string {
  return pickString(row, ["status", "state"]).toLowerCase();
}

/** Periode bulan sebelumnya dari "YYYY-MM", atau null bila format tidak valid. */
export function prevPeriod(period: string): string | null {
  const m = PERIOD_RE.exec(period);
  if (!m) return null;
  let year = Number(m[1]);
  let month = Number(m[2]) - 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Nama karyawan dari item payroll (mendukung nested employee). */
export function itemEmployeeName(item: RawRow): string {
  const emp = item.employee;
  if (emp && typeof emp === "object") {
    const n = pickString(emp as RawRow, ["full_name", "name"]);
    if (n) return n;
  }
  return pickString(item, ["full_name", "name", "employee_name", "employee_full_name"]);
}
