"use client";

import * as React from "react";
import { CheckCircle2, ClipboardList, UserX, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { cx, formatRupiah } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableRow as TableRowEl,
} from "@/components/ui/Table";
import { TaskRow } from "./TaskRow";
import {
  candidateEmployees,
  employeeLabel,
  isTaskDone,
  normalizeOffboarding,
  settlementRows,
} from "./helpers";
import type { ChecklistTask, EmployeeOption, Paged } from "./types";

const TEXTAREA_CLASS =
  "flex min-h-24 w-full rounded-control border border-border bg-surface px-3 py-2 text-base sm:text-sm text-text placeholder:text-text-tertiary";

const TYPE_OPTIONS = [
  { value: "", label: "Pilih alasan" },
  { value: "resign", label: "Mengundurkan diri" },
  { value: "terminate", label: "Pemutusan hubungan kerja" },
];

/* ---------------- Detail proses offboarding satu karyawan ---------------- */

function OffboardingDetail({ employee }: { employee: EmployeeOption }) {
  const detail = useApi(() =>
    api.get<unknown>(`/offboarding/${employee.id}`).catch((err: unknown) => {
      // 404 = belum ada proses offboarding → tangani sebagai kosong.
      if (err instanceof Error && "status" in err && (err as { status: number }).status === 404)
        return null;
      throw err;
    }),
  );
  const [togglingId, setTogglingId] = React.useState<string | number | null>(null);
  const [toggleError, setToggleError] = React.useState<string | null>(null);
  const [finishOpen, setFinishOpen] = React.useState(false);
  const [finishing, setFinishing] = React.useState(false);
  const [finishError, setFinishError] = React.useState<string | null>(null);
  const [finishedLocal, setFinishedLocal] = React.useState(false);

  const data = React.useMemo(
    () => (detail.data ? normalizeOffboarding(detail.data) : null),
    [detail.data],
  );

  async function handleToggle(task: ChecklistTask) {
    if (isTaskDone(task)) return;
    setTogglingId(task.id);
    setToggleError(null);
    try {
      await api.put(`/offboarding/tasks/${task.id}/complete`, {});
      await detail.reload();
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : "Gagal menandai tugas selesai.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleFinish() {
    setFinishing(true);
    setFinishError(null);
    try {
      const pending = (data?.tasks ?? []).filter((t) => !isTaskDone(t));
      for (const t of pending) {
        await api.put(`/offboarding/tasks/${t.id}/complete`, {});
      }
      setFinishedLocal(true);
      setFinishOpen(false);
      await detail.reload();
    } catch (err) {
      setFinishError(err instanceof Error ? err.message : "Gagal menyelesaikan offboarding.");
    } finally {
      setFinishing(false);
    }
  }

  if (detail.loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Memuat proses offboarding">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-card border border-border bg-surface p-5">
            <Skeleton shape="text" className="w-40" />
            <div className="mt-4 flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-14 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (detail.error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 rounded-card border border-border bg-surface p-5">
        <p className="text-sm font-medium text-text">Proses offboarding gagal dimuat</p>
        <p className="text-[13px] text-text-secondary">{detail.error}</p>
        <Button variant="outline" size="sm" onClick={() => void detail.reload()} className="mt-1">
          Muat ulang
        </Button>
      </div>
    );
  }

  if (!data || data.tasks.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface">
        <EmptyState
          icon={<UserX className="h-6 w-6" aria-hidden />}
          title="Belum ada proses offboarding"
          description={`${employee.full_name} belum memiliki proses offboarding aktif. Mulai dari formulir di atas.`}
        />
      </div>
    );
  }

  const finished = finishedLocal || data.finished;
  const pendingCount = data.tasks.filter((t) => !isTaskDone(t)).length;
  const settlement = settlementRows(data.settlement);

  return (
    <div className="flex flex-col gap-4">
      {finished && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-card border border-border bg-surface p-4"
        >
          <Badge variant="success" className="shrink-0">
            Offboarding selesai
          </Badge>
          <p className="text-sm text-text-secondary">
            Seluruh tugas clearance untuk {employee.full_name} sudah diselesaikan.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Clearance checklist */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-text-tertiary" aria-hidden />
              Clearance checklist
            </CardTitle>
            <CardDescription>
              {pendingCount === 0
                ? "Semua tugas clearance selesai."
                : `${pendingCount} tugas belum selesai`}
            </CardDescription>
          </CardHeader>
          {toggleError && (
            <p role="alert" className="mb-3 text-[13px] text-danger-text">
              {toggleError}
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {data.tasks.map((t) => (
              <TaskRow
                key={String(t.id)}
                task={t}
                onToggle={handleToggle}
                toggling={togglingId === t.id}
              />
            ))}
          </ul>
        </Card>

        {/* Final settlement */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-text-tertiary" aria-hidden />
              Final settlement
            </CardTitle>
            <CardDescription>Rincian pembayaran terakhir karyawan</CardDescription>
          </CardHeader>
          {settlement.length === 0 ? (
            <p className="text-[13px] text-text-secondary">
              Belum ada rincian penyelesaian untuk karyawan ini.
            </p>
          ) : (
            <Table>
              <TableBody>
                {settlement.map((row) => (
                  <TableRowEl key={row.label}>
                    <TableCell className={cx(row.strong && "font-semibold")}>
                      {row.label}
                    </TableCell>
                    <TableCell
                      numeric
                      className={cx(row.strong && "font-semibold")}
                    >
                      {row.value === null ? "—" : formatRupiah(row.value)}
                    </TableCell>
                  </TableRowEl>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {!finished && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setFinishError(null);
              setFinishOpen(true);
            }}
            disabled={pendingCount > 0}
            title={
              pendingCount > 0
                ? "Selesaikan seluruh tugas clearance terlebih dahulu"
                : "Selesaikan proses offboarding"
            }
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Selesaikan offboarding
          </Button>
        </div>
      )}

      <Dialog
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        title="Selesaikan offboarding"
        description={`Selesaikan proses offboarding untuk ${employee.full_name}?`}
      >
        <p className="text-sm text-text-secondary">
          Seluruh tugas clearance sudah selesai dan rincian final settlement sudah
          tercatat. Tindakan ini menandai proses offboarding sebagai selesai.
        </p>
        {finishError && (
          <p role="alert" className="mt-3 text-[13px] text-danger-text">
            {finishError}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setFinishOpen(false)} disabled={finishing}>
            Batal
          </Button>
          <Button onClick={handleFinish} loading={finishing}>
            Selesaikan
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

/* ---------------- Formulir mulai offboarding ---------------- */

function StartOffboardingCard({
  options,
  loading,
  onStarted,
}: {
  options: EmployeeOption[];
  loading: boolean;
  onStarted: (employeeId: string) => void;
}) {
  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [employeeId, setEmployeeId] = React.useState("");
  const [lastDate, setLastDate] = React.useState("");
  const [type, setType] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [started, setStarted] = React.useState(false);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!employeeId) e.employeeId = "Pilih karyawan";
    if (!lastDate) e.lastDate = "Pilih tanggal terakhir bekerja";
    else if (lastDate < today) e.lastDate = "Tanggal terakhir tidak boleh sebelum hari ini";
    if (!type) e.type = "Pilih alasan offboarding";
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const errs = validate();
    setErrors(errs);
    setSubmitError(null);
    setStarted(false);
    const firstInvalid = Object.keys(errs)[0];
    if (firstInvalid) {
      document.getElementById(`off-${firstInvalid}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      await api.post("/offboarding", {
        employee_id: employeeId,
        last_date: lastDate,
        type,
        reason: reason.trim() || null,
      });
      setStarted(true);
      setEmployeeId("");
      setLastDate("");
      setType("");
      setReason("");
      setErrors({});
      onStarted(employeeId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gagal memulai offboarding.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mulai offboarding</CardTitle>
        <CardDescription>
          Daftarkan karyawan yang akan keluar dan mulai proses clearance.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="off-employeeId" className="mb-1.5">
            Karyawan <span className="text-danger" aria-hidden>*</span>
          </Label>
          <Select
            id="off-employeeId"
            value={employeeId}
            invalid={!!errors.employeeId}
            disabled={loading}
            onChange={(e) => {
              setEmployeeId(e.target.value);
              setErrors((er) => ({ ...er, employeeId: "" }));
            }}
          >
            <option value="">Pilih karyawan…</option>
            {options.map((e) => (
              <option key={e.id} value={e.id}>
                {employeeLabel(e)}
              </option>
            ))}
          </Select>
          {errors.employeeId && (
            <p role="alert" className="mt-1 text-[13px] text-danger-text">
              {errors.employeeId}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="off-lastDate" className="mb-1.5">
            Tanggal terakhir <span className="text-danger" aria-hidden>*</span>
          </Label>
          <Input
            id="off-lastDate"
            type="date"
            min={today}
            value={lastDate}
            invalid={!!errors.lastDate}
            onChange={(e) => {
              setLastDate(e.target.value);
              setErrors((er) => ({ ...er, lastDate: "" }));
            }}
          />
          {errors.lastDate ? (
            <p role="alert" className="mt-1 text-[13px] text-danger-text">
              {errors.lastDate}
            </p>
          ) : (
            <p className="mt-1 text-xs text-text-tertiary">
              Hari terakhir karyawan bekerja, minimal hari ini.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="off-type" className="mb-1.5">
            Alasan <span className="text-danger" aria-hidden>*</span>
          </Label>
          <Select
            id="off-type"
            value={type}
            invalid={!!errors.type}
            onChange={(e) => {
              setType(e.target.value);
              setErrors((er) => ({ ...er, type: "" }));
            }}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          {errors.type && (
            <p role="alert" className="mt-1 text-[13px] text-danger-text">
              {errors.type}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="off-reason" className="mb-1.5">
            Keterangan
          </Label>
          <textarea
            id="off-reason"
            className={TEXTAREA_CLASS}
            value={reason}
            placeholder="Catatan tambahan (opsional)"
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {submitError && (
          <p role="alert" className="text-[13px] text-danger-text sm:col-span-2">
            {submitError}
          </p>
        )}
        {started && (
          <p role="status" className="text-[13px] text-success-text sm:col-span-2">
            Proses offboarding berhasil dimulai.
          </p>
        )}

        <div className="sm:col-span-2">
          <Button type="submit" loading={saving}>
            Mulai offboarding
          </Button>
        </div>
      </form>
    </Card>
  );
}

/* ---------------- Tab Offboarding ---------------- */

export function OffboardingTab() {
  const employees = useApi(() =>
    api.get<EmployeeOption[] | Paged<EmployeeOption>>("/employees", {
      query: { per_page: 100 },
    }),
  );
  const [viewId, setViewId] = React.useState("");

  const options = React.useMemo(() => {
    const raw = employees.data;
    const list = Array.isArray(raw) ? raw : (raw?.items ?? []);
    return candidateEmployees(list);
  }, [employees.data]);

  const viewing = options.find((e) => e.id === viewId) ?? null;

  return (
    <div>
      <PageHeader
        title="Offboarding"
        description="Kelola proses keluar karyawan: clearance, final settlement, dan penyelesaian."
      />

      <div className="flex flex-col gap-6">
        <StartOffboardingCard
          options={options}
          loading={employees.loading}
          onStarted={(id) => setViewId(id)}
        />

        <section aria-label="Proses offboarding">
          <div className="mb-4 max-w-md">
            <Label htmlFor="offboarding-employee" className="mb-1.5">
              Pilih karyawan
            </Label>
            {employees.loading ? (
              <Skeleton className="h-10 w-full" />
            ) : employees.error ? (
              <div role="alert" className="flex flex-col items-start gap-2">
                <p className="text-[13px] text-text-secondary">{employees.error}</p>
                <Button variant="outline" size="sm" onClick={() => void employees.reload()}>
                  Muat ulang
                </Button>
              </div>
            ) : (
              <Select
                id="offboarding-employee"
                value={viewId}
                onChange={(e) => setViewId(e.target.value)}
              >
                <option value="">Pilih karyawan…</option>
                {options.map((e) => (
                  <option key={e.id} value={e.id}>
                    {employeeLabel(e)}
                  </option>
                ))}
              </Select>
            )}
          </div>

          {viewing ? (
            <OffboardingDetail key={viewing.id} employee={viewing} />
          ) : (
            !employees.loading && (
              <div className="rounded-card border border-border bg-surface">
                <EmptyState
                  icon={<ClipboardList className="h-6 w-6" aria-hidden />}
                  title="Pilih karyawan untuk melihat proses offboarding"
                  description="Pilih karyawan dari daftar untuk melihat clearance checklist dan final settlement."
                />
              </div>
            )
          )}
        </section>
      </div>
    </div>
  );
}
