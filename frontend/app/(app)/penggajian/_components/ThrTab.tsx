"use client";

import * as React from "react";
import { Gift, Plus } from "lucide-react";
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
import { Skeleton } from "@/components/ui/Skeleton";
import { asRows, isThrRun, num, PERIOD_RE, pickString, runStatus, type RawRow } from "./normalize";
import { RunStatusBadge } from "./RunStatusBadge";

const HR_ROLES = ["super_admin", "hr_director", "hr_manager", "hr_officer"] as const;

interface ThrLocal {
  period: string;
  hijri_event_date: string;
  status: string;
}

function thrDate(row: RawRow, local?: ThrLocal): string {
  const fromRow = pickString(row, ["hijri_event_date", "event_date", "holiday_date", "tanggal_hari_raya"]);
  if (fromRow) return fromRow;
  return local?.hijri_event_date ?? "";
}

export function ThrTab() {
  const { hasRole } = useAuth();
  const canManage = hasRole(...HR_ROLES);
  const { data, error, loading, reload } = useApi(() => api.get<unknown>("/payroll/runs"));

  const [period, setPeriod] = React.useState("");
  const [eventDate, setEventDate] = React.useState("");
  const [periodError, setPeriodError] = React.useState<string | null>(null);
  const [dateError, setDateError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [localCreated, setLocalCreated] = React.useState<ThrLocal[]>([]);

  const thrRuns = React.useMemo(() => {
    const remote = asRows(data).filter((r) => isThrRun(r));
    const remotePeriods = new Set(remote.map((r) => pickString(r, ["period", "bulan", "month"])));
    const local = localCreated
      .filter((l) => !remotePeriods.has(l.period))
      .map(
        (l): RawRow => ({
          id: `local-${l.period}`,
          period: l.period,
          hijri_event_date: l.hijri_event_date,
          status: l.status,
        }),
      );
    const all = [...remote, ...local];
    all.sort((a, b) => pickString(b, ["period"]).localeCompare(pickString(a, ["period"])));
    return all.map((r) => ({
      row: r,
      local: localCreated.find((l) => l.period === pickString(r, ["period"])),
    }));
  }, [data, localCreated]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = period.trim();
    let valid = true;
    if (!PERIOD_RE.test(p)) {
      setPeriodError("Masukkan periode dengan format YYYY-MM, mis. 2026-09.");
      valid = false;
    } else {
      setPeriodError(null);
    }
    if (!eventDate) {
      setDateError("Pilih tanggal hari raya.");
      valid = false;
    } else {
      setDateError(null);
    }
    if (!valid) return;

    setSubmitError(null);
    setSubmitting(true);
    try {
      await api.post("/payroll/thr", { period: p, hijri_event_date: eventDate });
      setLocalCreated((prev) =>
        prev.some((l) => l.period === p) ? prev : [{ period: p, hijri_event_date: eventDate, status: "draft" }, ...prev],
      );
      setPeriod("");
      setEventDate("");
      await reload();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gagal membuat run THR. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="THR"
        description="Buat dan pantau run tunjangan hari raya di luar periode gaji reguler."
      />

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Buat run THR</CardTitle>
            <CardDescription>
              Run THR dibuat terpisah dari periode gaji reguler.
            </CardDescription>
          </CardHeader>
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="thr-period">Periode</Label>
                <Input
                  id="thr-period"
                  type="text"
                  inputMode="numeric"
                  placeholder="2026-09"
                  value={period}
                  invalid={!!periodError}
                  onChange={(e) => {
                    setPeriod(e.target.value);
                    if (periodError) setPeriodError(null);
                  }}
                  className="mt-1.5"
                />
                {periodError ? (
                  <p role="alert" className="mt-1.5 text-[13px] text-danger-text">
                    {periodError}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[13px] text-text-tertiary">Format YYYY-MM, mis. 2026-09.</p>
                )}
              </div>
              <div>
                <Label htmlFor="thr-date">Tanggal hari raya</Label>
                <Input
                  id="thr-date"
                  type="date"
                  value={eventDate}
                  invalid={!!dateError}
                  onChange={(e) => {
                    setEventDate(e.target.value);
                    if (dateError) setDateError(null);
                  }}
                  className="mt-1.5"
                />
                {dateError && (
                  <p role="alert" className="mt-1.5 text-[13px] text-danger-text">
                    {dateError}
                  </p>
                )}
              </div>
            </div>
            {submitError && (
              <p role="alert" className="text-[13px] text-danger-text">
                {submitError}
              </p>
            )}
            <div>
              <Button type="submit" loading={submitting}>
                <Plus className="h-4 w-4" aria-hidden />
                Buat run THR
              </Button>
            </div>
          </form>
        </Card>
      )}

      <section aria-label="Daftar run THR">
        <h2 className="mb-3 text-base font-semibold text-text">Run THR</h2>
        {loading ? (
          <div className="flex flex-col gap-3" aria-label="Memuat run THR">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} shape="text" className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-2 rounded-card border border-border bg-surface p-5"
          >
            <p className="text-sm font-medium text-text">Run THR gagal dimuat</p>
            <p className="text-[13px] text-text-secondary">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void reload()} className="mt-1">
              Muat ulang
            </Button>
          </div>
        ) : thrRuns.length === 0 ? (
          <div className="rounded-card border border-border bg-surface">
            <EmptyState
              icon={<Gift className="h-6 w-6" aria-hidden />}
              title="Belum ada run THR"
              description="Buat run THR untuk periode hari raya yang akan datang."
              actionLabel={canManage ? "Buat run THR" : undefined}
              onAction={canManage ? () => document.getElementById("thr-period")?.focus() : undefined}
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {thrRuns.map(({ row, local }, i) => {
              const p = pickString(row, ["period", "bulan", "month"]);
              const date = thrDate(row, local);
              const employees = num(row, ["total_employees", "total_karyawan", "employee_count", "headcount"]);
              const net = num(row, ["total_net", "total_neto", "net"]);
              const id = pickString(row, ["id"]);
              return (
                <li
                  key={id || `${p}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent"
                      aria-hidden
                    >
                      <Gift className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="tnum text-sm font-semibold text-text">THR {p || "—"}</p>
                      <p className="text-[13px] text-text-secondary">
                        Hari raya {date ? formatDate(date) : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[13px] text-text-tertiary">
                        {employees > 0 ? `${employees.toLocaleString("id-ID")} karyawan` : "—"}
                      </p>
                      <p className="tnum text-sm font-medium text-text">
                        {net > 0 ? formatRupiah(net) : "—"}
                      </p>
                    </div>
                    <RunStatusBadge status={runStatus(row)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
