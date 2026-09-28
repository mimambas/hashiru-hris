"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Plus, ReceiptText } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
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
import { asRows, isThrRun, num, PERIOD_RE, pickString, runStatus, type RawRow } from "./normalize";
import { RunStatusBadge } from "./RunStatusBadge";

const HR_ROLES = ["super_admin", "hr_director", "hr_manager", "hr_officer"] as const;

/* ================= Dialog buat periode ================= */

function CreateRunDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [period, setPeriod] = React.useState("");
  const [fieldError, setFieldError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setPeriod("");
    setFieldError(null);
    setSubmitError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = period.trim();
    if (!PERIOD_RE.test(value)) {
      setFieldError("Masukkan periode dengan format YYYY-MM, mis. 2026-09.");
      inputRef.current?.focus();
      return;
    }
    setFieldError(null);
    setSubmitError(null);
    setSubmitting(true);
    try {
      await api.post("/payroll/runs", { period: value });
      onCreated();
      reset();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gagal membuat periode. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Buat periode gaji"
      description="Buat run payroll baru dengan status draf untuk periode yang dipilih."
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="run-period">Periode</Label>
          <Input
            ref={inputRef}
            id="run-period"
            type="text"
            inputMode="numeric"
            placeholder="2026-09"
            value={period}
            invalid={!!fieldError}
            onChange={(e) => {
              setPeriod(e.target.value);
              if (fieldError) setFieldError(null);
            }}
            className="mt-1.5"
            aria-describedby={fieldError ? "run-period-error" : undefined}
          />
          {fieldError ? (
            <p id="run-period-error" role="alert" className="mt-1.5 text-[13px] text-danger-text">
              {fieldError}
            </p>
          ) : (
            <p className="mt-1.5 text-[13px] text-text-tertiary">Format YYYY-MM, mis. 2026-09.</p>
          )}
        </div>
        {submitError && (
          <p role="alert" className="text-[13px] text-danger-text">
            {submitError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Batal
          </Button>
          <Button type="submit" loading={submitting}>
            <Plus className="h-4 w-4" aria-hidden />
            Buat periode
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ================= Tab periode gaji ================= */

export function PeriodeTab() {
  const { hasRole } = useAuth();
  const canManage = hasRole(...HR_ROLES);
  const { data, error, loading, reload } = useApi(() => api.get<unknown>("/payroll/runs"));
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const runs = React.useMemo(() => {
    const rows = asRows(data).filter((r) => !isThrRun(r));
    rows.sort((a, b) => pickString(b, ["period", "bulan", "month"]).localeCompare(pickString(a, ["period", "bulan", "month"])));
    return rows;
  }, [data]);

  function rowId(row: RawRow, index: number): string {
    return pickString(row, ["id"]) || String(index);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Penggajian"
        description="Kelola periode gaji, kalkulasi, persetujuan, dan slip karyawan."
        actions={
          canManage ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Buat periode
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div
          className="overflow-hidden rounded-card border border-border bg-surface"
          aria-label="Memuat daftar periode"
        >
          <div className="flex flex-col gap-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} shape="text" className="h-6 w-full" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-2 rounded-card border border-border bg-surface p-5"
        >
          <p className="text-sm font-medium text-text">Daftar periode gagal dimuat</p>
          <p className="text-[13px] text-text-secondary">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void reload()} className="mt-1">
            Muat ulang
          </Button>
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<ReceiptText className="h-6 w-6" aria-hidden />}
            title="Belum ada periode gaji"
            description="Buat periode gaji pertama untuk mulai menghitung payroll karyawan."
            actionLabel={canManage ? "Buat periode" : undefined}
            onAction={canManage ? () => setDialogOpen(true) : undefined}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead numeric>Total karyawan</TableHead>
                  <TableHead numeric>Total bruto</TableHead>
                  <TableHead numeric>Total neto</TableHead>
                  <TableHead>
                    <span className="sr-only">Buka detail</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((row, i) => {
                  const period = pickString(row, ["period", "bulan", "month"]);
                  const status = runStatus(row);
                  return (
                    <TableRow key={rowId(row, i)}>
                      <TableCell>
                        <Link
                          href={`/penggajian/periode/${rowId(row, i)}`}
                          className="font-medium text-accent hover:underline"
                        >
                          {period || "—"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <RunStatusBadge status={status} />
                      </TableCell>
                      <TableCell numeric>
                        {num(row, ["total_employees", "total_karyawan", "employee_count", "headcount"]).toLocaleString(
                          "id-ID",
                        )}
                      </TableCell>
                      <TableCell numeric>{formatRupiah(num(row, ["total_gross", "total_bruto", "gross"]))}</TableCell>
                      <TableCell numeric>{formatRupiah(num(row, ["total_net", "total_neto", "net"]))}</TableCell>
                      <TableCell>
                        <Link
                          href={`/penggajian/periode/${rowId(row, i)}`}
                          aria-label={`Buka detail periode ${period || ""}`}
                          className="inline-flex text-text-tertiary hover:text-text"
                        >
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableWrapper>
        </div>
      )}

      <CreateRunDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={() => void reload()} />
    </div>
  );
}
