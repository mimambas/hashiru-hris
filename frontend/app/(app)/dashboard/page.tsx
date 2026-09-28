"use client";

import * as React from "react";
import {
  Cake,
  CalendarCheck,
  Clock3,
  FileWarning,
  LogIn,
  LogOut,
  Plane,
  ReceiptText,
  TrendingDown,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import {
  cx,
  formatDate,
  formatPercent,
  formatRupiah,
  formatRupiahCompact,
  formatTodayLong,
  greetingByTime,
} from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, StatCardSkeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { StatusDot } from "@/components/ui/StatusDot";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  AreaChartCard,
  BarCard,
  DonutCard,
  type AreaPoint,
  type BarRow,
  type BarSeries,
  type DonutSlice,
} from "@/components/charts";

/* ================= Tipe respons API ================= */

interface Kpis {
  headcount: number;
  new_hires_mtd: number;
  turnover_mtd: number;
  payroll_mtd: number;
  attendance_rate_today: number;
}

interface RawRow {
  [key: string]: unknown;
}

interface AttendanceToday {
  status?: string | null;
  check_in?: string | null;
  check_out?: string | null;
}

interface LeaveBalance {
  leave_type: string;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
}

interface Payslip {
  period?: string;
  net_pay?: number;
}

interface AlertItem {
  id: string;
  kind: "contract" | "probation" | "birthday";
  title: string;
  description: string;
}

/* ================= Normalisasi bentuk respons ================= */

function pickNumber(obj: RawRow, keys: string[]): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return 0;
}

function pickString(obj: RawRow, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return "";
}

function asRows(raw: unknown): RawRow[] {
  if (Array.isArray(raw)) return raw as RawRow[];
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    for (const k of ["data", "items", "results"]) {
      if (Array.isArray(r[k])) return r[k] as RawRow[];
    }
    if (Array.isArray(r.labels) && Array.isArray(r.values)) {
      return (r.labels as unknown[]).map((label, i) => ({
        label: String(label),
        value: Number((r.values as unknown[])[i] ?? 0),
      }));
    }
  }
  return [];
}

function toAreaPoints(raw: unknown): AreaPoint[] {
  return asRows(raw).map((r) => ({
    label: pickString(r, ["label", "month", "period", "name"]),
    value: pickNumber(r, ["value", "headcount", "count", "total"]),
  }));
}

function toDonutSlices(raw: unknown): DonutSlice[] {
  return asRows(raw).map((r) => ({
    name: pickString(r, ["name", "department", "label"]),
    value: pickNumber(r, ["value", "count", "total", "headcount"]),
  }));
}

function toBarRows(raw: unknown, seriesKeys: string[]): { rows: BarRow[]; series: BarSeries[] } {
  const rows = asRows(raw);
  const series: BarSeries[] = seriesKeys.map((key) => ({
    key,
    name: prettifySeriesKey(key),
  }));
  return {
    rows: rows.map((r) => {
      const row: BarRow = { label: pickString(r, ["label", "department", "name", "type", "leave_type"]) };
      for (const key of seriesKeys) row[key] = pickNumber(r, [key]);
      return row;
    }),
    series,
  };
}

function prettifySeriesKey(key: string): string {
  const map: Record<string, string> = {
    approved: "Disetujui",
    pending: "Menunggu",
    rejected: "Ditolak",
    total: "Total",
    value: "Jumlah",
  };
  return map[key] ?? key.replace(/_/g, " ");
}

function toAlerts(raw: unknown): AlertItem[] {
  const items: AlertItem[] = [];
  const push = (kind: AlertItem["kind"], rows: RawRow[]) => {
    for (const r of rows) {
      const name = pickString(r, ["full_name", "employee_name", "name"]);
      const dateStr = pickString(r, ["end_date", "contract_end", "probation_end", "date_of_birth", "date"]);
      const daysLeft = pickNumber(r, ["days_left", "days_remaining"]);
      const desc =
        kind === "birthday"
          ? dateStr
            ? `Berulang tahun pada ${formatDate(dateStr)}`
            : "Berulang tahun bulan ini"
          : daysLeft > 0
            ? `${daysLeft} hari lagi${dateStr ? ` · ${formatDate(dateStr)}` : ""}`
            : dateStr
              ? formatDate(dateStr)
              : "Segera berakhir";
      items.push({
        id: `${kind}-${pickString(r, ["id", "employee_id"]) || name}`,
        kind,
        title: name || "Karyawan",
        description: desc,
      });
    }
  };

  if (Array.isArray(raw)) {
    push("contract", raw as RawRow[]);
  } else if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    push("contract", asRows(r.contract_expiring ?? r.contracts ?? r.expiring_contracts));
    push("probation", asRows(r.probation_ending ?? r.probations));
    push("birthday", asRows(r.birthdays ?? r.birthdays_this_month));
  }
  return items;
}

/* ================= Bagian: KPI ================= */

function KpiSection() {
  const { data, error, loading, reload } = useApi(() => api.get<Kpis>("/dashboard/kpis"));

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="Memuat indikator">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-card border border-border bg-surface p-5" role="alert">
        <p className="text-sm font-medium text-text">Indikator gagal dimuat</p>
        <p className="text-[13px] text-text-secondary">{error ?? "Data tidak tersedia."}</p>
        <Button variant="outline" size="sm" onClick={() => void reload()} className="mt-1">
          Muat ulang
        </Button>
      </div>
    );
  }

  const cards = [
    { label: "Total karyawan", value: data.headcount.toLocaleString("id-ID"), hint: "karyawan aktif", icon: <Users className="h-4 w-4" aria-hidden />, tone: "accent" as const },
    { label: "Karyawan baru", value: data.new_hires_mtd.toLocaleString("id-ID"), hint: "bulan ini", icon: <UserPlus className="h-4 w-4" aria-hidden />, tone: "info" as const },
    { label: "Tingkat turnover", value: formatPercent(data.turnover_mtd), hint: "bulan ini", icon: <TrendingDown className="h-4 w-4" aria-hidden />, tone: "warning" as const },
    { label: "Total payroll", value: formatRupiah(data.payroll_mtd), hint: "bulan ini", icon: <Wallet className="h-4 w-4" aria-hidden />, tone: "neutral" as const },
    { label: "Kehadiran hari ini", value: formatPercent(data.attendance_rate_today), hint: "karyawan hadir", icon: <CalendarCheck className="h-4 w-4" aria-hidden />, tone: "success" as const },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((c, i) => (
        <div key={c.label} className="animate-fade-slide-in" style={{ animationDelay: `${i * 100}ms` }}>
          <StatCard {...c} className="h-full" />
        </div>
      ))}
    </div>
  );
}

/* ================= Bagian: Perlu perhatian ================= */

const ALERT_META: Record<AlertItem["kind"], { icon: React.ReactNode; label: string }> = {
  contract: { icon: <FileWarning className="h-4 w-4" aria-hidden />, label: "Kontrak berakhir" },
  probation: { icon: <Clock3 className="h-4 w-4" aria-hidden />, label: "Masa percobaan" },
  birthday: { icon: <Cake className="h-4 w-4" aria-hidden />, label: "Ulang tahun" },
};

function AlertsPanel() {
  const { data, error, loading, reload } = useApi(() => api.get<unknown>("/dashboard/alerts"));
  const alerts = React.useMemo(() => toAlerts(data), [data]);
  const groups = React.useMemo(() => {
    const order: AlertItem["kind"][] = ["contract", "probation", "birthday"];
    return order
      .map((kind) => ({ kind, items: alerts.filter((a) => a.kind === kind) }))
      .filter((g) => g.items.length > 0);
  }, [alerts]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Perlu perhatian</CardTitle>
        <CardDescription>Kontrak, masa percobaan, dan ulang tahun karyawan</CardDescription>
      </CardHeader>
      {loading ? (
        <div className="flex flex-col gap-3" aria-label="Memuat peringatan">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton shape="circle" className="h-9 w-9" />
              <div className="flex-1">
                <Skeleton shape="text" className="w-40" />
                <Skeleton shape="text" className="mt-1.5 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-col items-start gap-2 py-4">
          <p className="text-sm font-medium text-text">Peringatan gagal dimuat</p>
          <p className="text-[13px] text-text-secondary">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void reload()}>
            Muat ulang
          </Button>
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="h-6 w-6" aria-hidden />}
          title="Tidak ada yang perlu perhatian"
          description="Semua kontrak, masa percobaan, dan jadwal terpantau aman."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <section key={g.kind} aria-label={ALERT_META[g.kind].label}>
              <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-text-secondary">
                <span className="text-text-tertiary">{ALERT_META[g.kind].icon}</span>
                {ALERT_META[g.kind].label}
                <span className="tnum text-text-tertiary">({g.items.length})</span>
              </p>
              <ul className="flex flex-col gap-1">
                {g.items.slice(0, 5).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-control px-3 py-2 transition-colors hover:bg-muted"
                  >
                    <span className="truncate text-sm font-medium text-text" title={a.title}>
                      {a.title}
                    </span>
                    <span className="shrink-0 text-[13px] text-text-secondary">{a.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ================= Bagian: Widget ESS ================= */

const ATTENDANCE_LABEL: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  present: { label: "Hadir", variant: "success" },
  late: { label: "Terlambat", variant: "warning" },
  early_leave: { label: "Pulang cepat", variant: "warning" },
  absent: { label: "Absen", variant: "danger" },
  wfh: { label: "WFH", variant: "info" },
  leave: { label: "Cuti", variant: "info" },
  holiday: { label: "Libur", variant: "neutral" },
};

function EssWidget() {
  const now = React.useMemo(() => new Date(), []);
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const attendance = useApi(() => api.get<AttendanceToday | null>("/attendance/today"));
  const balances = useApi(() => api.get<LeaveBalance[] | { items: LeaveBalance[] }>("/leave-balances/me"));
  const payslip = useApi(() =>
    api
      .get<Payslip>(`/payroll/payslip`, { query: { period } })
      .catch(() => null),
  );

  const [acting, setActing] = React.useState<"in" | "out" | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const record = attendance.data;
  const checkedIn = !!record?.check_in;
  const checkedOut = !!record?.check_out;

  async function doCheck(kind: "in" | "out") {
    setActing(kind);
    setActionError(null);
    try {
      if (kind === "in") await api.post("/attendance/check-in", {});
      else await api.post("/attendance/check-out", {});
      await attendance.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal mencatat absensi. Coba lagi.");
    } finally {
      setActing(null);
    }
  }

  const balanceRows = React.useMemo(() => {
    const raw = balances.data;
    const list = Array.isArray(raw) ? raw : (raw?.items ?? []);
    return list.filter((b) => b.remaining_days > 0);
  }, [balances.data]);
  const totalRemaining = balanceRows.reduce((s, b) => s + b.remaining_days, 0);

  const statusMeta = record?.status ? ATTENDANCE_LABEL[record.status] : undefined;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Absensi & info saya</CardTitle>
        <CardDescription>{formatTodayLong(now)}</CardDescription>
      </CardHeader>

      <div className="flex flex-col gap-5">
        {/* Status absensi hari ini */}
        <section aria-label="Status absensi hari ini">
          {attendance.loading ? (
            <Skeleton className="h-20 w-full" />
          ) : attendance.error ? (
            <div role="alert" className="text-[13px] text-text-secondary">
              <p>{attendance.error}</p>
              <Button variant="outline" size="sm" onClick={() => void attendance.reload()} className="mt-2">
                Muat ulang
              </Button>
            </div>
          ) : (
            <div className="rounded-control border border-border bg-muted/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] text-text-secondary">Status hari ini</p>
                {statusMeta ? (
                  <Badge variant={statusMeta.variant}>
                    <StatusDot variant={statusMeta.variant} label={statusMeta.label} className="text-xs" />
                  </Badge>
                ) : (
                  <Badge variant="neutral">Belum check-in</Badge>
                )}
              </div>
              {(checkedIn || checkedOut) && (
                <p className="tnum mt-2 text-sm text-text">
                  {checkedIn && `Masuk ${record?.check_in?.slice(0, 5) ?? ""}`}
                  {checkedIn && checkedOut && " · "}
                  {checkedOut && `Keluar ${record?.check_out?.slice(0, 5) ?? ""}`}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                {!checkedIn ? (
                  <Button onClick={() => void doCheck("in")} loading={acting === "in"} className="flex-1">
                    <LogIn className="h-4 w-4" aria-hidden />
                    Check-in
                  </Button>
                ) : !checkedOut ? (
                  <Button variant="secondary" onClick={() => void doCheck("out")} loading={acting === "out"} className="flex-1">
                    <LogOut className="h-4 w-4" aria-hidden />
                    Check-out
                  </Button>
                ) : (
                  <p className="text-[13px] text-text-secondary">Absensi hari ini sudah lengkap.</p>
                )}
              </div>
              {actionError && (
                <p role="alert" className="mt-2 text-[13px] text-danger-text">
                  {actionError}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Sisa cuti */}
        <section aria-label="Sisa cuti">
          <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-text-secondary">
            <Plane className="h-4 w-4 text-text-tertiary" aria-hidden />
            Sisa cuti
          </p>
          {balances.loading ? (
            <Skeleton shape="text" className="w-32" />
          ) : balances.error ? (
            <p className="text-[13px] text-text-secondary">
              {balances.error}{" "}
              <button onClick={() => void balances.reload()} className="text-accent underline underline-offset-2">
                Muat ulang
              </button>
            </p>
          ) : balanceRows.length === 0 ? (
            <p className="text-[13px] text-text-secondary">Tidak ada sisa cuti tahun ini.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {balanceRows.slice(0, 4).map((b) => (
                <li key={b.leave_type} className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{leaveTypeLabel(b.leave_type)}</span>
                  <span className="tnum font-medium text-text">{b.remaining_days} hari</span>
                </li>
              ))}
              <li className="mt-1 flex items-center justify-between border-t border-border pt-2 text-sm">
                <span className="font-medium text-text">Total</span>
                <span className="tnum font-semibold text-text">{totalRemaining} hari</span>
              </li>
            </ul>
          )}
        </section>

        {/* Slip gaji terakhir */}
        <section aria-label="Slip gaji terakhir">
          <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-text-secondary">
            <ReceiptText className="h-4 w-4 text-text-tertiary" aria-hidden />
            Slip gaji terakhir
          </p>
          {payslip.loading ? (
            <Skeleton shape="text" className="w-40" />
          ) : payslip.data?.net_pay ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="tnum text-lg font-semibold text-text">{formatRupiah(payslip.data.net_pay)}</p>
                <p className="text-xs text-text-tertiary">Periode {payslip.data.period ?? period}</p>
              </div>
              <Button variant="outline" size="sm" disabled title="Segera hadir">
                Unduh slip
              </Button>
            </div>
          ) : (
            <p className="text-[13px] text-text-secondary">
              Slip gaji periode ini belum tersedia.
            </p>
          )}
        </section>
      </div>
    </Card>
  );
}

function leaveTypeLabel(code: string): string {
  const map: Record<string, string> = {
    AL: "Cuti tahunan",
    SL: "Cuti sakit",
    PL: "Cuti pribadi",
    ML: "Cuti melahirkan",
    PT: "Cuti ayah",
    BL: "Cuti menikah",
    MR: "Cuti menikahkan anak",
    HJ: "Cuti haji",
    UL: "Cuti tidak dibayar",
    CB: "Cuti bersama",
  };
  return map[code] ?? code;
}

/* ================= Halaman dashboard ================= */

export default function DashboardPage() {
  const { user } = useAuth();
  const now = React.useMemo(() => new Date(), []);
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const year = now.getFullYear();

  const firstName = user?.employee?.full_name?.split(" ")[0] ?? "Pengguna";

  const headcountTrend = useApi(() =>
    api.get<unknown>("/dashboard/charts/headcount-trend", { query: { months: 12 } }),
  );
  const deptDist = useApi(() => api.get<unknown>("/dashboard/charts/department-distribution"));
  const payrollByDept = useApi(() =>
    api.get<unknown>("/dashboard/charts/payroll-by-department", { query: { period } }),
  );
  const leaveByType = useApi(() =>
    api.get<unknown>("/dashboard/charts/leave-by-type", { query: { year } }),
  );

  const trendPoints = React.useMemo(() => toAreaPoints(headcountTrend.data), [headcountTrend.data]);
  const deptSlices = React.useMemo(() => toDonutSlices(deptDist.data), [deptDist.data]);

  const payroll = React.useMemo(() => {
    const rows = asRows(payrollByDept.data);
    const valueKey = rows.length > 0 ? detectValueKey(rows[0]) : "value";
    return toBarRows(payrollByDept.data, [valueKey]);
  }, [payrollByDept.data]);

  const leave = React.useMemo(() => {
    const rows = asRows(leaveByType.data);
    const keys = rows.length > 0 ? detectSeriesKeys(rows[0]) : ["value"];
    const { rows: barRows, series } = toBarRows(leaveByType.data, keys);
    return {
      rows: barRows.map((r) => ({ ...r, label: leaveTypeLabel(String(r.label)) })),
      series,
    };
  }, [leaveByType.data]);

  const isEmployee = user?.role === "employee";

  return (
    <div className="flex flex-col gap-6">
      {/* Sapaan */}
      <div className="animate-fade-slide-in">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {greetingByTime(now)}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{formatTodayLong(now)}</p>
      </div>

      {/* KPI */}
      <section aria-label="Indikator utama">
        <KpiSection />
      </section>

      {/* Grafik */}
      <section aria-label="Grafik" className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="animate-fade-slide-in lg:col-span-2" style={{ animationDelay: "100ms" }}>
          <AreaChartCard
            title="Tren headcount"
            description="Jumlah karyawan aktif 12 bulan terakhir"
            data={trendPoints}
            loading={headcountTrend.loading}
            error={headcountTrend.error}
            onRetry={() => void headcountTrend.reload()}
          />
        </div>
        <div className="animate-fade-slide-in" style={{ animationDelay: "200ms" }}>
          <DonutCard
            title="Distribusi departemen"
            description="Komposisi karyawan per departemen"
            data={deptSlices}
            loading={deptDist.loading}
            error={deptDist.error}
            onRetry={() => void deptDist.reload()}
          />
        </div>
        <div className="animate-fade-slide-in" style={{ animationDelay: "300ms" }}>
          <BarCard
            title="Payroll per departemen"
            description={`Total payroll periode ${period}`}
            data={payroll.rows}
            series={payroll.series.map((s) => ({ ...s, name: "Total payroll" }))}
            loading={payrollByDept.loading}
            error={payrollByDept.error}
            onRetry={() => void payrollByDept.reload()}
            valueFormatter={formatRupiah}
            axisFormatter={formatRupiahCompact}
          />
        </div>
        <div className="animate-fade-slide-in lg:col-span-2" style={{ animationDelay: "400ms" }}>
          <BarCard
            title="Cuti per tipe"
            description={`Pengajuan cuti tahun ${year}`}
            data={leave.rows}
            series={leave.series}
            stacked
            loading={leaveByType.loading}
            error={leaveByType.error}
            onRetry={() => void leaveByType.reload()}
          />
        </div>
      </section>

      {/* Bawah: peringatan + ESS */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className={cx("animate-fade-slide-in", isEmployee ? "lg:col-span-2" : "lg:col-span-3")} style={{ animationDelay: "500ms" }}>
          <AlertsPanel />
        </div>
        {isEmployee && (
          <div className="animate-fade-slide-in" style={{ animationDelay: "600ms" }}>
            <EssWidget />
          </div>
        )}
      </div>
    </div>
  );
}

/** Cari kunci nilai numerik pertama pada baris mentah (selain label). */
function detectValueKey(row: RawRow): string {
  const labelKeys = new Set(["label", "department", "name", "type", "leave_type", "month", "period", "id"]);
  for (const [k, v] of Object.entries(row)) {
    if (!labelKeys.has(k) && typeof v === "number") return k;
  }
  return "value";
}

/** Cari semua kunci numerik untuk stacked bar (selain label). */
function detectSeriesKeys(row: RawRow): string[] {
  const labelKeys = new Set(["label", "department", "name", "type", "leave_type", "month", "period", "id"]);
  const keys = Object.entries(row)
    .filter(([k, v]) => !labelKeys.has(k) && typeof v === "number")
    .map(([k]) => k);
  return keys.length > 0 ? keys : ["value"];
}
