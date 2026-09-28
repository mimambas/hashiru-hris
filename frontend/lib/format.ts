import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gabung class secara kondisional (clsx + tailwind-merge). */
export function cx(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** "Rp 8.500.000" — titik sebagai pemisah ribuan, tanpa desimal bila bulat. */
export function formatRupiah(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "Rp 0";
  const rounded = Math.round(value);
  return `Rp ${rounded.toLocaleString("id-ID")}`;
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function toDate(value: string | number | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "28 Sep 2026" */
export function formatDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const d = toDate(value);
  if (!d) return "—";
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "28 Sep 2026, 14.30" */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const d = toDate(value);
  if (!d) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(d)}, ${hh}.${mm}`;
}

/** "baru saja", "5 menit lalu", "2 jam lalu", "3 hari lalu" */
export function timeAgo(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const d = toDate(value);
  if (!d) return "—";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return formatDate(d);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return formatDate(d);
}

/** "12,5%" dengan koma desimal ala Indonesia */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

/** Sapaan berdasarkan jam: "Selamat pagi" / "Selamat siang" / "Selamat sore" / "Selamat malam" */
export function greetingByTime(date = new Date()): string {
  const h = date.getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

/** Tanggal hari ini panjang: "Senin, 28 September 2026" */
export function formatTodayLong(date = new Date()): string {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Rp 8,5 jt" / "Rp 1,2 M" — untuk label sumbu grafik yang sempit. */
export function formatRupiahCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "Rp 0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000)
    return `Rp ${trimNum(value / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `Rp ${trimNum(value / 1_000_000)} jt`;
  if (abs >= 1_000) return `Rp ${trimNum(value / 1_000)} rb`;
  return `Rp ${Math.round(value)}`;
}

function trimNum(n: number): string {
  return n.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}
