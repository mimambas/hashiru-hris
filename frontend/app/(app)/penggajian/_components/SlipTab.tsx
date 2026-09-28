"use client";

import * as React from "react";
import { Printer, ReceiptText, User } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { formatDate, formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  asRows,
  isThrRun,
  num,
  PERIOD_RE,
  pickString,
  runStatus,
  type RawRow,
} from "./normalize";
import { RunStatusBadge } from "./RunStatusBadge";

interface SlipLine {
  label: string;
  amount: number;
}

/** Ambil rincian sebagai daftar baris; dukung array [{label,amount}] atau key tunggal. */
function toLines(
  slip: RawRow,
  listKeys: string[],
  fallbacks: { label: string; keys: string[] }[],
): SlipLine[] {
  for (const k of listKeys) {
    const raw = slip[k];
    if (Array.isArray(raw)) {
      return (raw as RawRow[])
        .map((r) => ({
          label: pickString(r, ["label", "name", "description", "jenis", "type"]),
          amount: num(r, ["amount", "value", "nominal", "total"]),
        }))
        .filter((l) => l.label || l.amount !== 0);
    }
  }
  return fallbacks.map((f) => ({ label: f.label, amount: num(slip, f.keys) }));
}

const EARNING_LINES = [
  { label: "Gaji pokok", keys: ["base_salary", "basic", "basic_salary", "gaji_pokok"] },
  { label: "Tunjangan", keys: ["allowances", "fixed_allowances", "tunjangan", "total_allowances"] },
  { label: "Lembur", keys: ["overtime_pay", "overtime", "lembur"] },
  { label: "Bonus/komisi", keys: ["bonus", "commission", "bonuses", "komisi"] },
];

const DEDUCTION_LINES = [
  { label: "BPJS kesehatan", keys: ["bpjs_kesehatan", "bpjs_health"] },
  {
    label: "BPJS ketenagakerjaan",
    keys: ["bpjs_ketenagakerjaan", "bpjs_tk", "bpjs_employment", "bpjs_jht", "bpjs_jp"],
  },
  { label: "PPh 21", keys: ["pph21", "income_tax", "pajak", "pph"] },
  { label: "Potongan lain", keys: ["other_deductions", "potongan_lain", "deductions_other"] },
];

function SlipLinesTable({ lines, totalLabel }: { lines: SlipLine[]; totalLabel: string }) {
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return (
    <table className="w-full text-sm">
      <tbody>
        {lines.map((l, i) => (
          <tr key={`${l.label}-${i}`} className="border-b border-border last:border-0">
            <td className="py-2.5 pr-4 text-text-secondary">{l.label}</td>
            <td className="tnum py-2.5 text-right text-text">{formatRupiah(l.amount)}</td>
          </tr>
        ))}
        <tr className="border-t border-border">
          <td className="py-2.5 pr-4 font-semibold text-text">{totalLabel}</td>
          <td className="tnum py-2.5 text-right font-semibold text-text">{formatRupiah(total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function SlipTab() {
  const { user } = useAuth();
  const runsApi = useApi(() => api.get<unknown>("/payroll/runs"));
  const [period, setPeriod] = React.useState("");
  const [manualMode, setManualMode] = React.useState(false);

  const options = React.useMemo(() => {
    const rows = asRows(runsApi.data)
      .filter((r) => !isThrRun(r))
      .filter((r) => ["approved", "paid"].includes(runStatus(r)))
      .map((r) => pickString(r, ["period", "bulan", "month"]))
      .filter((p) => p !== "");
    rows.sort((a, b) => b.localeCompare(a));
    return Array.from(new Set(rows));
  }, [runsApi.data]);

  React.useEffect(() => {
    if (!period && options.length > 0) setPeriod(options[0]);
  }, [options, period]);

  const slipApi = useApi<unknown>(
    () =>
      period
        ? api.get<unknown>("/payroll/payslip", { query: { period } }).catch(() => null)
        : Promise.resolve(null),
    [period],
  );

  const slip = slipApi.data as RawRow | null;

  const slipStatus = slip ? runStatus(slip) : "";
  const employeeName = slip
    ? (() => {
        const emp = slip.employee;
        if (emp && typeof emp === "object") {
          const n = pickString(emp as RawRow, ["full_name", "name"]);
          if (n) return n;
        }
        return (
          pickString(slip, ["full_name", "name", "employee_name"]) ||
          user?.employee?.full_name ||
          "Karyawan"
        );
      })()
    : "";

  const earnings = slip ? toLines(slip, ["earnings", "penghasilan", "earning_lines"], EARNING_LINES) : [];
  const deductions = slip ? toLines(slip, ["deductions", "potongan", "deduction_lines"], DEDUCTION_LINES) : [];
  const totalEarn =
    (slip ? num(slip, ["total_earnings", "total_penghasilan", "total_gross", "gross", "bruto"]) : 0) ||
    earnings.reduce((s, l) => s + l.amount, 0);
  const totalDed =
    (slip ? num(slip, ["total_deductions", "total_potongan", "potongan"]) : 0) ||
    deductions.reduce((s, l) => s + l.amount, 0);
  const netPay =
    (slip ? num(slip, ["net_pay", "gaji_bersih", "net", "take_home_pay", "neto"]) : 0) ||
    totalEarn - totalDed;
  const slipPeriod = slip ? pickString(slip, ["period", "bulan", "month"]) || period : period;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex flex-col gap-6">
      <style>{`@media print { body * { visibility: hidden; } .print-area, .print-area * { visibility: visible; } .print-area { position: absolute; inset: 0; } }`}</style>

      <PageHeader
        title="Slip saya"
        description="Lihat dan unduh slip gaji Anda untuk periode yang sudah disetujui."
        actions={
          slip && !slipApi.loading ? (
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4" aria-hidden />
              Unduh PDF
            </Button>
          ) : undefined
        }
      />

      <div className="flex max-w-md flex-col gap-2">
        {runsApi.loading ? (
          <Skeleton shape="text" className="h-10 w-full" />
        ) : options.length > 0 && !manualMode ? (
          <>
            <Label htmlFor="slip-period">Periode</Label>
            <Select id="slip-period" value={period} onChange={(e) => setPeriod(e.target.value)}>
              {options.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </>
        ) : (
          <>
            <Label htmlFor="slip-period-manual">Periode</Label>
            <Input
              id="slip-period-manual"
              type="text"
              inputMode="numeric"
              placeholder="2026-09"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
            <p className="text-[13px] text-text-tertiary">
              {options.length === 0
                ? "Belum ada periode yang disetujui. Masukkan periode manual dengan format YYYY-MM."
                : "Masukkan periode manual dengan format YYYY-MM."}
            </p>
          </>
        )}
        {options.length > 0 && (
          <button
            type="button"
            onClick={() => setManualMode((m) => !m)}
            className="self-start text-[13px] text-accent underline underline-offset-2"
          >
            {manualMode ? "Gunakan daftar periode" : "Masukkan periode manual"}
          </button>
        )}
      </div>

      {period && !PERIOD_RE.test(period) && (
        <p role="alert" className="text-[13px] text-danger-text">
          Format periode tidak valid. Gunakan format YYYY-MM, mis. 2026-09.
        </p>
      )}

      {slipApi.loading ? (
        <Card aria-label="Memuat slip gaji">
          <div className="flex flex-col gap-3">
            <Skeleton shape="text" className="h-6 w-48" />
            <Skeleton shape="text" className="h-4 w-32" />
            <Skeleton shape="text" className="mt-2 h-24 w-full" />
          </div>
        </Card>
      ) : !slip ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<ReceiptText className="h-6 w-6" aria-hidden />}
            title="Slip belum tersedia"
            description={
              period
                ? `Slip gaji periode ${period} belum tersedia. Slip hanya bisa dilihat setelah periode gaji disetujui.`
                : "Pilih periode gaji untuk melihat slip Anda."
            }
            actionLabel="Muat ulang"
            onAction={() => void slipApi.reload()}
          />
        </div>
      ) : (
        <div className="print-area">
          <Card>
            <CardHeader>
              <CardTitle>Slip gaji</CardTitle>
              <CardDescription>Periode {slipPeriod}</CardDescription>
            </CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-text-secondary"
                  aria-hidden
                >
                  <User className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-text">{employeeName}</p>
                  <p className="text-[13px] text-text-secondary">
                    {pickString(slip, ["employee_id", "nik"])
                      ? `NIK ${pickString(slip, ["employee_id", "nik"])}`
                      : formatDate(pickString(slip, ["generated_at", "created_at", "pay_date"])) || ""}
                  </p>
                </div>
              </div>
              {slipStatus && <RunStatusBadge status={slipStatus} />}
            </div>

            <div className="grid grid-cols-1 gap-6 pt-4 lg:grid-cols-2">
              <section aria-label="Penghasilan">
                <h3 className="mb-2 text-sm font-semibold text-text">Penghasilan</h3>
                <SlipLinesTable lines={earnings} totalLabel="Total penghasilan" />
              </section>
              <section aria-label="Potongan">
                <h3 className="mb-2 text-sm font-semibold text-text">Potongan</h3>
                <SlipLinesTable lines={deductions} totalLabel="Total potongan" />
              </section>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-control bg-muted px-4 py-3.5">
              <p className="text-sm font-semibold text-text">Gaji bersih</p>
              <p className="tnum text-lg font-bold text-text">{formatRupiah(netPay)}</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
