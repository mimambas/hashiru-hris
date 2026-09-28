"use client";

import * as React from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { api, getAccessToken } from "@/lib/api";
import { cx, formatDate, formatDateTime, formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/Table";

/* ================= Konfigurasi ================= */

export type ReportFilterKind = "range" | "period" | "year";

export interface ReportConfig {
  key: string;
  title: string;
  description: string;
  endpoint: string;
  filter: ReportFilterKind;
  /** Tampilkan filter departemen tambahan (laporan absensi). */
  departmentFilter?: boolean;
  icon?: React.ReactNode;
}

interface Department {
  id: string;
  name: string;
}

interface RawRow {
  [key: string]: unknown;
}

/* ================= Normalisasi defensif ================= */

function asRows(raw: unknown): RawRow[] {
  if (Array.isArray(raw)) return raw as RawRow[];
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    for (const k of ["data", "items", "results", "rows"]) {
      if (Array.isArray(r[k])) return r[k] as RawRow[];
    }
  }
  return [];
}

function prettifyKey(key: string): string {
  const s = key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const MONEY_RE = /(salary|pay|amount|nominal|gaji|upah|rupiah|net|gross|deduction|potong|thr|bonus)/i;

function formatStatValue(key: string, value: unknown): string {
  const num = typeof value === "number" ? value : Number(value);
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (Number.isNaN(num)) return String(value);
  if (MONEY_RE.test(key)) return formatRupiah(num);
  return num.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

/** Ambil agregat penting: kunci mengandung total/count/sum/average/rata/jumlah. */
function extractStats(
  statsObj: Record<string, unknown> | null,
): { label: string; value: string }[] {
  if (!statsObj) return [];
  const stats: { label: string; value: string }[] = [];
  for (const [k, v] of Object.entries(statsObj)) {
    if (stats.length >= 4) break;
    if (v === null || v === undefined) continue;
    if (typeof v === "object") continue;
    if (!/(total|count|sum|average|avg|rata|jumlah)/i.test(k)) continue;
    stats.push({ label: prettifyKey(k), value: formatStatValue(k, v) });
  }
  return stats;
}

const STATS_WRAPPERS = [
  "summary",
  "totals",
  "aggregate",
  "aggregates",
  "overview",
  "stats",
  "statistics",
  "meta",
];

function unwrap(raw: unknown): {
  statsObj: Record<string, unknown> | null;
  rows: RawRow[];
  isArray: boolean;
} {
  const isArray = Array.isArray(raw);
  const rows = asRows(raw);
  let statsObj: Record<string, unknown> | null = null;
  if (!isArray && raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    for (const k of STATS_WRAPPERS) {
      const v = r[k];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        statsObj = v as Record<string, unknown>;
        break;
      }
    }
    if (!statsObj) statsObj = r;
  }
  return { statsObj, rows, isArray };
}

/* ================= Pratinjau tabel ================= */

function pickColumns(rows: RawRow[]): string[] {
  const cols: string[] = [];
  for (const r of rows.slice(0, 3)) {
    for (const k of Object.keys(r)) {
      if (cols.includes(k) || cols.length >= 6) continue;
      const v = r[k];
      if (v !== null && typeof v === "object") continue;
      cols.push(k);
    }
    if (cols.length >= 6) break;
  }
  return cols;
}

function formatCell(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "number") {
    if (MONEY_RE.test(key)) return formatRupiah(value);
    return value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
  }
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime()))
        return /T\d{2}:\d{2}/.test(value) ? formatDateTime(value) : formatDate(value);
    }
    return value.length > 48 ? `${value.slice(0, 48)}…` : value;
  }
  return "—";
}

function isNumericColumn(rows: RawRow[], key: string): boolean {
  return rows.slice(0, 5).some((r) => typeof r[key] === "number");
}

function GenericPreview({ rows }: { rows: RawRow[] }) {
  const columns = pickColumns(rows);
  const shown = rows.slice(0, 8);
  const rest = rows.length - shown.length;
  if (columns.length === 0) return null;
  return (
    <div>
      <TableWrapper className="rounded-control border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c} numeric={isNumericColumn(rows, c)}>
                  {prettifyKey(c)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((r, i) => (
              <TableRow key={i}>
                {columns.map((c) => (
                  <TableCell key={c} numeric={isNumericColumn(rows, c)}>
                    {formatCell(c, r[c])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableWrapper>
      {rest > 0 && (
        <p className="tnum mt-2 text-xs text-text-tertiary">
          +{rest} baris lainnya — unduh untuk data lengkap
        </p>
      )}
    </div>
  );
}

function MetricPreview({ statsObj }: { statsObj: Record<string, unknown> }) {
  const entries = Object.entries(statsObj).filter(
    ([, v]) => v !== null && v !== undefined && typeof v !== "object",
  );
  const shown = entries.slice(0, 8);
  const rest = entries.length - shown.length;
  if (shown.length === 0) return null;
  return (
    <div>
      <TableWrapper className="rounded-control border border-border">
        <Table>
          <TableBody>
            {shown.map(([k, v]) => (
              <TableRow key={k}>
                <TableCell>{prettifyKey(k)}</TableCell>
                <TableCell numeric>{formatStatValue(k, v)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableWrapper>
      {rest > 0 && (
        <p className="tnum mt-2 text-xs text-text-tertiary">
          +{rest} baris lainnya — unduh untuk data lengkap
        </p>
      )}
    </div>
  );
}

/* ================= Hasil laporan ================= */

function ReportResult({ raw }: { raw: unknown }) {
  const { statsObj, rows, isArray } = unwrap(raw);
  const stats = React.useMemo(() => {
    const s = extractStats(statsObj);
    if (s.length === 0 && isArray) {
      return [{ label: "Total baris", value: rows.length.toLocaleString("id-ID") }];
    }
    return s;
  }, [statsObj, isArray, rows.length]);

  const hasContent = stats.length > 0 || rows.length > 0;

  if (!hasContent) {
    return (
      <p className="text-[13px] text-text-secondary">
        Tidak ada data untuk filter yang dipilih.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {stats.length > 0 && (
        <div
          className={cx(
            "grid gap-3",
            stats.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2",
          )}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-control border border-border bg-muted/40 p-3"
            >
              <p className="truncate text-xs text-text-secondary" title={s.label}>
                {s.label}
              </p>
              <p className="tnum mt-1 truncate text-lg font-semibold text-text" title={s.value}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      )}
      {rows.length > 0 ? (
        <GenericPreview rows={rows} />
      ) : (
        statsObj && <MetricPreview statsObj={statsObj} />
      )}
    </div>
  );
}

/* ================= Kartu laporan ================= */

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: first.toISOString().slice(0, 10), to };
}

function defaultPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function ReportCard({ config }: { config: ReportConfig }) {
  const range = React.useMemo(defaultRange, []);
  const [from, setFrom] = React.useState(range.from);
  const [to, setTo] = React.useState(range.to);
  const [period, setPeriod] = React.useState(defaultPeriod());
  const [year, setYear] = React.useState(String(new Date().getFullYear()));
  const [departmentId, setDepartmentId] = React.useState("");

  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [data, setData] = React.useState<unknown>(null);
  const [hasResult, setHasResult] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [downloading, setDownloading] = React.useState<"xlsx" | "pdf" | null>(null);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);

  // Departemen hanya diambil untuk kartu yang membutuhkannya (laporan absensi).
  React.useEffect(() => {
    if (!config.departmentFilter) return;
    void api
      .get<Department[] | { items?: Department[] }>("/departments")
      .then((r) => setDepartments(Array.isArray(r) ? r : (r.items ?? [])))
      .catch(() => setDepartments([]));
  }, [config.departmentFilter]);

  function buildQuery(): Record<string, string> {
    if (config.filter === "range") {
      const q: Record<string, string> = { from, to };
      if (config.departmentFilter && departmentId) q.department_id = departmentId;
      return q;
    }
    if (config.filter === "period") return { period };
    return { year };
  }

  function fileParam(): string {
    if (config.filter === "range") return `${from}_${to}`;
    if (config.filter === "period") return period;
    return year;
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (config.filter === "range") {
      if (!from) e.from = "Pilih tanggal awal";
      if (!to) e.to = "Pilih tanggal akhir";
      if (from && to && from > to) e.to = "Tanggal akhir tidak boleh sebelum tanggal awal";
    } else if (config.filter === "period") {
      if (!PERIOD_RE.test(period.trim()))
        e.period = "Format periode harus YYYY-MM, mis. 2026-09";
    } else {
      const y = Number(year);
      if (!year.trim() || Number.isNaN(y) || y < 2000 || y > 2100)
        e.year = "Masukkan tahun yang valid (2000–2100)";
    }
    return e;
  }

  async function handleShow() {
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    setError(null);
    setDownloadError(null);
    try {
      const result = await api.get<unknown>(config.endpoint, { query: buildQuery() });
      setData(result);
      setHasResult(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat laporan.");
      setHasResult(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(format: "xlsx" | "pdf") {
    setDownloading(format);
    setDownloadError(null);
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(
        /\/$/,
        "",
      );
      const url = new URL(`${base}${config.endpoint}`);
      for (const [k, v] of Object.entries(buildQuery())) url.searchParams.set(k, v);
      url.searchParams.set("format", format);
      const token = getAccessToken();
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 404)
        throw new Error("Format unduhan belum didukung server.");
      if (!res.ok) throw new Error("Gagal mengunduh laporan. Coba lagi.");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `laporan-${config.key}-${fileParam()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Gagal mengunduh laporan. Coba lagi.",
      );
    } finally {
      setDownloading(null);
    }
  }

  const canDownload = hasResult && !loading && downloading === null;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start gap-3">
          {config.icon && (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-muted text-text-secondary"
              aria-hidden
            >
              {config.icon}
            </span>
          )}
          <div className="min-w-0">
            <CardTitle>{config.title}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      {/* Filter */}
      <div className="flex flex-col gap-3">
        {config.filter === "range" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`${config.key}-from`} className="mb-1.5">
                Dari
              </Label>
              <Input
                id={`${config.key}-from`}
                type="date"
                value={from}
                invalid={!!fieldErrors.from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setFieldErrors((er) => ({ ...er, from: "", to: "" }));
                }}
              />
              {fieldErrors.from && (
                <p role="alert" className="mt-1 text-[13px] text-danger-text">
                  {fieldErrors.from}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor={`${config.key}-to`} className="mb-1.5">
                Sampai
              </Label>
              <Input
                id={`${config.key}-to`}
                type="date"
                value={to}
                invalid={!!fieldErrors.to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setFieldErrors((er) => ({ ...er, to: "" }));
                }}
              />
              {fieldErrors.to && (
                <p role="alert" className="mt-1 text-[13px] text-danger-text">
                  {fieldErrors.to}
                </p>
              )}
            </div>
          </div>
        )}

        {config.filter === "period" && (
          <div>
            <Label htmlFor={`${config.key}-period`} className="mb-1.5">
              Periode
            </Label>
            <Input
              id={`${config.key}-period`}
              value={period}
              placeholder="YYYY-MM"
              inputMode="numeric"
              invalid={!!fieldErrors.period}
              onChange={(e) => {
                setPeriod(e.target.value);
                setFieldErrors((er) => ({ ...er, period: "" }));
              }}
            />
            {fieldErrors.period ? (
              <p role="alert" className="mt-1 text-[13px] text-danger-text">
                {fieldErrors.period}
              </p>
            ) : (
              <p className="mt-1 text-xs text-text-tertiary">Format YYYY-MM, mis. 2026-09.</p>
            )}
          </div>
        )}

        {config.filter === "year" && (
          <div>
            <Label htmlFor={`${config.key}-year`} className="mb-1.5">
              Tahun
            </Label>
            <Input
              id={`${config.key}-year`}
              type="number"
              min={2000}
              max={2100}
              value={year}
              invalid={!!fieldErrors.year}
              onChange={(e) => {
                setYear(e.target.value);
                setFieldErrors((er) => ({ ...er, year: "" }));
              }}
            />
            {fieldErrors.year && (
              <p role="alert" className="mt-1 text-[13px] text-danger-text">
                {fieldErrors.year}
              </p>
            )}
          </div>
        )}

        {config.departmentFilter && (
          <div>
            <Label htmlFor={`${config.key}-dept`} className="mb-1.5">
              Departemen
            </Label>
            <Select
              id={`${config.key}-dept`}
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">Semua departemen</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Aksi */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleShow} loading={loading}>
            Tampilkan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleDownload("xlsx")}
            disabled={!canDownload}
            loading={downloading === "xlsx"}
            title={hasResult ? "Unduh sebagai Excel" : "Tampilkan laporan terlebih dahulu"}
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden />
            Unduh Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleDownload("pdf")}
            disabled={!canDownload}
            loading={downloading === "pdf"}
            title={hasResult ? "Unduh sebagai PDF" : "Tampilkan laporan terlebih dahulu"}
          >
            <FileText className="h-4 w-4" aria-hidden />
            Unduh PDF
          </Button>
        </div>

        {downloadError && (
          <p role="alert" className="text-[13px] text-danger-text">
            {downloadError}
          </p>
        )}
      </div>

      {/* Hasil */}
      <div className="mt-4 flex-1">
        {loading ? (
          <div className="flex flex-col gap-3" aria-label={`Memuat ${config.title}`}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error ? (
          <div role="alert" className="flex flex-col items-start gap-2 py-2">
            <p className="text-sm font-medium text-text">Laporan gagal dimuat</p>
            <p className="text-[13px] text-text-secondary">{error}</p>
            <Button variant="outline" size="sm" onClick={handleShow} className="mt-1">
              Muat ulang
            </Button>
          </div>
        ) : hasResult ? (
          <ReportResult raw={data} />
        ) : (
          <p className="text-[13px] text-text-tertiary">
            Atur filter lalu tekan Tampilkan untuk melihat ringkasan laporan.
          </p>
        )}
      </div>
    </Card>
  );
}
