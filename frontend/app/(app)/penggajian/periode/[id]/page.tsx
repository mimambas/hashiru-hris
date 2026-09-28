"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Calculator,
  FileDown,
  Landmark,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { api, getAccessToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Skeleton, StatCardSkeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/Table";
import {
  asRows,
  itemEmployeeName,
  num,
  pickString,
  prevPeriod,
  runStatus,
  type RawRow,
} from "../../_components/normalize";
import { RunStatusBadge } from "../../_components/RunStatusBadge";

const HR_ROLES = ["super_admin", "hr_director", "hr_manager", "hr_officer"] as const;
const BANKS = ["BCA", "Mandiri", "BRI", "BNI"];

/* ================= Agregasi item ================= */

function itemGross(item: RawRow): number {
  const explicit = num(item, ["total_earnings", "total_bruto", "gross", "total_penghasilan", "bruto"]);
  if (explicit > 0) return explicit;
  return (
    num(item, ["base_salary", "basic", "basic_salary", "gaji_pokok"]) +
    num(item, ["allowances", "fixed_allowances", "tunjangan", "total_allowances"]) +
    num(item, ["overtime_pay", "overtime", "lembur"]) +
    num(item, ["bonus", "commission", "bonuses", "komisi"])
  );
}

function itemBpjs(item: RawRow): number {
  return num(item, [
    "bpjs_kesehatan",
    "bpjs_health",
    "bpjs_ketenagakerjaan",
    "bpjs_tk",
    "bpjs_employment",
    "bpjs_jht",
    "bpjs_jp",
    "bpjs",
    "bpjs_total",
  ]);
}

function itemPph(item: RawRow): number {
  return num(item, ["pph21", "income_tax", "pajak", "pph"]);
}

function itemDeductions(item: RawRow): number {
  const explicit = num(item, ["total_deductions", "total_potongan", "potongan"]);
  if (explicit > 0) return explicit;
  return (
    itemBpjs(item) + itemPph(item) + num(item, ["other_deductions", "potongan_lain", "deductions_other"])
  );
}

function itemNet(item: RawRow): number {
  const explicit = num(item, ["net_pay", "gaji_bersih", "net", "take_home_pay", "neto"]);
  if (explicit > 0) return explicit;
  return itemGross(item) - itemDeductions(item);
}

/* ================= Dialog persetujuan ================= */

function ApproveDialog({
  open,
  onClose,
  onDecided,
  totalGross,
  totalDeductions,
  totalNet,
  totalEmployees,
}: {
  open: boolean;
  onClose: () => void;
  onDecided: (approve: boolean, comment?: string) => Promise<void>;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalEmployees: number;
}) {
  const [rejectMode, setRejectMode] = React.useState(false);
  const [comment, setComment] = React.useState("");
  const [commentError, setCommentError] = React.useState<string | null>(null);
  const [acting, setActing] = React.useState<"approve" | "reject" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setRejectMode(false);
    setComment("");
    setCommentError(null);
    setActing(null);
    setError(null);
  }

  async function decide(approve: boolean) {
    if (!approve && comment.trim() === "") {
      setCommentError("Tulis alasan penolakan sebelum mengirim.");
      return;
    }
    setError(null);
    setActing(approve ? "approve" : "reject");
    try {
      await onDecided(approve, approve ? undefined : comment.trim());
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses persetujuan. Coba lagi.");
    } finally {
      setActing(null);
    }
  }

  const summary = [
    { label: "Total bruto", value: formatRupiah(totalGross) },
    { label: "Total potongan", value: formatRupiah(totalDeductions) },
    { label: "Total neto", value: formatRupiah(totalNet) },
    { label: "Jumlah karyawan", value: totalEmployees.toLocaleString("id-ID") },
  ];

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={rejectMode ? "Tolak periode gaji" : "Setujui periode gaji"}
      description={
        rejectMode
          ? "Tulis alasan penolakan agar tim payroll dapat memperbaiki kalkulasi."
          : "Periksa ringkasan di bawah sebelum menyetujui. Periode yang disetujui tidak bisa diubah."
      }
    >
      <div className="flex flex-col gap-4">
        <dl className="rounded-control border border-border bg-muted/50 px-4 py-3">
          {summary.map((s) => (
            <div key={s.label} className="flex items-center justify-between py-1 text-sm">
              <dt className="text-text-secondary">{s.label}</dt>
              <dd className="tnum font-medium text-text">{s.value}</dd>
            </div>
          ))}
        </dl>

        {rejectMode && (
          <div>
            <Label htmlFor="reject-comment">Komentar penolakan</Label>
            <Input
              id="reject-comment"
              type="text"
              placeholder="Mis. tunjangan lembur belum masuk"
              value={comment}
              invalid={!!commentError}
              onChange={(e) => {
                setComment(e.target.value);
                if (commentError) setCommentError(null);
              }}
              className="mt-1.5"
            />
            {commentError && (
              <p role="alert" className="mt-1.5 text-[13px] text-danger-text">
                {commentError}
              </p>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="text-[13px] text-danger-text">
            {error}
          </p>
        )}

        {!rejectMode ? (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectMode(true)} disabled={acting !== null}>
              Tolak
            </Button>
            <Button onClick={() => void decide(true)} loading={acting === "approve"}>
              Setujui
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectMode(false)} disabled={acting !== null}>
              Batal
            </Button>
            <Button variant="destructive" onClick={() => void decide(false)} loading={acting === "reject"}>
              Tolak run
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}

/* ================= Dialog file bank ================= */

function BankFileDialog({
  open,
  onClose,
  runId,
  period,
}: {
  open: boolean;
  onClose: () => void;
  runId: string;
  period: string;
}) {
  const [bank, setBank] = React.useState("BCA");
  const [downloading, setDownloading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleDownload() {
    setError(null);
    setDownloading(true);
    try {
      const csv = await api.get<string>(`/payroll/runs/${runId}/bank-file`, { query: { bank } });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bank-file-${period || runId}-${bank}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunduh file bank. Coba lagi.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Unduh file bank"
      description="Pilih bank tujuan untuk mengunduh file transfer gaji (CSV)."
    >
      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="bank-select">Bank</Label>
          <Select id="bank-select" value={bank} onChange={(e) => setBank(e.target.value)} className="mt-1.5">
            {BANKS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </div>
        {error && (
          <p role="alert" className="text-[13px] text-danger-text">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={() => void handleDownload()} loading={downloading}>
            <Landmark className="h-4 w-4" aria-hidden />
            Unduh CSV
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/* ================= Halaman detail periode ================= */

export default function PeriodeDetailPage() {
  const params = useParams();
  const idParam = params.id;
  const id = Array.isArray(idParam) ? idParam[0] : (idParam ?? "");

  const { hasRole } = useAuth();
  const canManage = hasRole(...HR_ROLES);
  const isFinance = hasRole("finance_officer");

  const { data, error, loading, reload } = useApi<unknown>(
    () => (id ? api.get<unknown>(`/payroll/runs/${id}`) : Promise.resolve(null)),
    [id],
  );

  const [search, setSearch] = React.useState("");
  const [calculating, setCalculating] = React.useState(false);
  const [calcError, setCalcError] = React.useState<string | null>(null);
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [bankOpen, setBankOpen] = React.useState(false);
  const [rekapLoading, setRekapLoading] = React.useState(false);
  const [rekapError, setRekapError] = React.useState<string | null>(null);

  const raw = (data ?? {}) as RawRow;
  const run: RawRow =
    raw.run && typeof raw.run === "object" ? (raw.run as RawRow) : raw;
  const items = React.useMemo(
    () => asRows(raw.items ?? raw.employees ?? raw.data ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  const period = pickString(run, ["period", "bulan", "month"]);
  const status = runStatus(run);
  const totalEmployees = num(run, ["total_employees", "total_karyawan", "employee_count", "headcount"]) || items.length;

  const totalGross = React.useMemo(
    () => num(run, ["total_gross", "total_bruto", "gross", "bruto"]) || items.reduce((s, it) => s + itemGross(it), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );
  const totalDeductions = React.useMemo(
    () => num(run, ["total_deductions", "total_potongan", "potongan"]) || items.reduce((s, it) => s + itemDeductions(it), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );
  const totalNet = React.useMemo(
    () => num(run, ["total_net", "total_neto", "net", "neto"]) || items.reduce((s, it) => s + itemNet(it), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  /* Perbandingan vs bulan lalu */
  const year = period ? period.slice(0, 4) : null;
  const prevApi = useApi<unknown>(
    () => (year ? api.get<unknown>("/payroll/runs", { query: { year } }) : Promise.resolve(null)),
    [year],
  );
  const prevDelta = React.useMemo(() => {
    const prev = prevPeriod(period);
    if (!prev) return null;
    const prevRow = asRows(prevApi.data).find((r) => pickString(r, ["period", "bulan", "month"]) === prev);
    if (!prevRow) return null;
    const prevNet = num(prevRow, ["total_net", "total_neto", "net"]);
    if (prevNet <= 0) return null;
    return ((totalNet - prevNet) / prevNet) * 100;
  }, [prevApi.data, period, totalNet]);

  const deltaText =
    prevDelta === null
      ? "—"
      : `${prevDelta >= 0 ? "+" : ""}${prevDelta.toFixed(1).replace(".", ",")}%`;
  const deltaHint =
    prevDelta === null
      ? "Tidak ada data bulan lalu"
      : prevDelta >= 0
        ? "Naik dari bulan lalu"
        : "Turun dari bulan lalu";

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => itemEmployeeName(it).toLowerCase().includes(q));
  }, [items, search]);

  async function handleCalculate() {
    setCalcError(null);
    setCalculating(true);
    try {
      await api.post(`/payroll/runs/${id}/calculate`, {});
      await reload();
    } catch (err) {
      setCalcError(err instanceof Error ? err.message : "Gagal menghitung gaji. Coba lagi.");
    } finally {
      setCalculating(false);
    }
  }

  async function handleDecide(approve: boolean, comment?: string) {
    await api.put(`/payroll/runs/${id}/approve`, approve ? { approve: true } : { approve: false, comment });
    await reload();
  }

  async function handleRekap() {
    setRekapError(null);
    setRekapLoading(true);
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, "");
      const token = getAccessToken();
      const res = await fetch(`${base}/payroll/runs/${id}/export?format=xlsx`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Gagal mengunduh rekap. Coba lagi.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rekap-payroll-${period || id}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setRekapError(err instanceof Error ? err.message : "Gagal mengunduh rekap. Coba lagi.");
    } finally {
      setRekapLoading(false);
    }
  }

  const canDownloadBank = (status === "approved" || status === "paid") && (canManage || isFinance);
  const canRekap = canManage || isFinance;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/penggajian"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] text-text-secondary hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Kembali ke penggajian
      </Link>

      {loading ? (
        <>
          <Skeleton shape="text" className="h-8 w-56" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <Skeleton shape="text" className="h-64 w-full" />
        </>
      ) : error || !data ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-2 rounded-card border border-border bg-surface p-5"
        >
          <p className="text-sm font-medium text-text">Detail periode gagal dimuat</p>
          <p className="text-[13px] text-text-secondary">{error ?? "Data tidak ditemukan."}</p>
          <Button variant="outline" size="sm" onClick={() => void reload()} className="mt-1">
            Muat ulang
          </Button>
        </div>
      ) : (
        <>
          <PageHeader
            title={`Periode ${period || id}`}
            description="Detail kalkulasi gaji per karyawan."
            actions={
              <>
                {canDownloadBank && (
                  <Button variant="outline" onClick={() => setBankOpen(true)}>
                    <Landmark className="h-4 w-4" aria-hidden />
                    Unduh file bank
                  </Button>
                )}
                {canRekap && (
                  <Button variant="outline" onClick={() => void handleRekap()} loading={rekapLoading}>
                    <FileDown className="h-4 w-4" aria-hidden />
                    Unduh rekap
                  </Button>
                )}
                {status === "draft" && canManage && (
                  <Button onClick={() => void handleCalculate()} loading={calculating}>
                    <Calculator className="h-4 w-4" aria-hidden />
                    Hitung gaji
                  </Button>
                )}
                {status === "calculated" && canManage && (
                  <Button onClick={() => setApproveOpen(true)}>
                    Setujui
                  </Button>
                )}
              </>
            }
          />

          <div className="flex items-center gap-3">
            <RunStatusBadge status={status} />
          </div>

          {(calcError || rekapError) && (
            <p role="alert" className="text-[13px] text-danger-text">
              {calcError ?? rekapError}
            </p>
          )}

          <section aria-label="Ringkasan periode" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total bruto"
              value={formatRupiah(totalGross)}
              hint={`${totalEmployees.toLocaleString("id-ID")} karyawan`}
              icon={<Wallet className="h-4 w-4" aria-hidden />}
              tone="neutral"
            />
            <StatCard
              label="Total potongan"
              value={formatRupiah(totalDeductions)}
              hint="BPJS, PPh 21, dan potongan lain"
              icon={<TrendingDown className="h-4 w-4" aria-hidden />}
              tone="warning"
            />
            <StatCard
              label="Total neto"
              value={formatRupiah(totalNet)}
              hint="Gaji bersih seluruh karyawan"
              icon={<TrendingUp className="h-4 w-4" aria-hidden />}
              tone="success"
            />
            <StatCard
              label="Vs bulan lalu"
              value={deltaText}
              hint={deltaHint}
              icon={<TrendingUp className="h-4 w-4" aria-hidden />}
              tone={prevDelta === null ? "neutral" : prevDelta >= 0 ? "success" : "danger"}
            />
          </section>

          <section aria-label="Rincian per karyawan">
            <div className="mb-3 max-w-sm">
              <Label htmlFor="item-search">Cari karyawan</Label>
              <div className="relative mt-1.5">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
                  aria-hidden
                />
                <Input
                  id="item-search"
                  type="search"
                  placeholder="Nama karyawan"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-card border border-border bg-surface">
                <EmptyState
                  title={items.length === 0 ? "Belum ada rincian karyawan" : "Tidak ada karyawan yang cocok"}
                  description={
                    items.length === 0
                      ? "Jalankan kalkulasi gaji untuk mengisi rincian per karyawan."
                      : "Coba kata kunci pencarian lain."
                  }
                />
              </div>
            ) : (
              <div className="overflow-hidden rounded-card border border-border bg-surface">
                <TableWrapper>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead numeric>Gaji pokok</TableHead>
                        <TableHead numeric>Tunjangan</TableHead>
                        <TableHead numeric>Lembur</TableHead>
                        <TableHead numeric>BPJS</TableHead>
                        <TableHead numeric>PPh 21</TableHead>
                        <TableHead numeric>Gaji bersih</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((it, i) => (
                        <TableRow key={pickString(it, ["id", "employee_id"]) || `${itemEmployeeName(it)}-${i}`}>
                          <TableCell className="font-medium">{itemEmployeeName(it) || "—"}</TableCell>
                          <TableCell numeric>
                            {formatRupiah(num(it, ["base_salary", "basic", "basic_salary", "gaji_pokok"]))}
                          </TableCell>
                          <TableCell numeric>
                            {formatRupiah(num(it, ["allowances", "fixed_allowances", "tunjangan", "total_allowances"]))}
                          </TableCell>
                          <TableCell numeric>
                            {formatRupiah(num(it, ["overtime_pay", "overtime", "lembur"]))}
                          </TableCell>
                          <TableCell numeric>{formatRupiah(itemBpjs(it))}</TableCell>
                          <TableCell numeric>{formatRupiah(itemPph(it))}</TableCell>
                          <TableCell numeric className="font-semibold">
                            {formatRupiah(itemNet(it))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableWrapper>
              </div>
            )}
          </section>

          <ApproveDialog
            open={approveOpen}
            onClose={() => setApproveOpen(false)}
            onDecided={handleDecide}
            totalGross={totalGross}
            totalDeductions={totalDeductions}
            totalNet={totalNet}
            totalEmployees={totalEmployees}
          />
          <BankFileDialog
            open={bankOpen}
            onClose={() => setBankOpen(false)}
            runId={id}
            period={period}
          />
        </>
      )}
    </div>
  );
}
