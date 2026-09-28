"use client";

import * as React from "react";
import { ClipboardList, ListChecks, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { TaskRow } from "./TaskRow";
import {
  candidateEmployees,
  employeeLabel,
  groupOrder,
  isTaskDone,
  normalizeOnboarding,
  taskGroup,
} from "./helpers";
import type { ChecklistTask, EmployeeOption, Paged } from "./types";

/* ---------------- Checklist satu karyawan ---------------- */

function OnboardingChecklist({
  employee,
  onRequestGenerate,
}: {
  employee: EmployeeOption;
  onRequestGenerate: () => void;
}) {
  const checklist = useApi(() =>
    api.get<unknown>(`/onboarding/${employee.id}`).catch((err: unknown) => {
      // 404 = belum punya checklist → tangani sebagai kosong, bukan error.
      if (err instanceof Error && "status" in err && (err as { status: number }).status === 404)
        return null;
      throw err;
    }),
  );
  const [togglingId, setTogglingId] = React.useState<string | number | null>(null);
  const [toggleError, setToggleError] = React.useState<string | null>(null);

  const data = React.useMemo(
    () => (checklist.data ? normalizeOnboarding(checklist.data) : null),
    [checklist.data],
  );

  async function handleToggle(task: ChecklistTask) {
    if (isTaskDone(task)) return;
    setTogglingId(task.id);
    setToggleError(null);
    try {
      await api.put(`/onboarding/tasks/${task.id}/complete`, {});
      await checklist.reload();
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : "Gagal menandai tugas selesai.");
    } finally {
      setTogglingId(null);
    }
  }

  if (checklist.loading) {
    return (
      <div className="flex flex-col gap-4" aria-label="Memuat checklist onboarding">
        <Skeleton className="h-16 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-control border border-border bg-surface px-3 py-3">
            <Skeleton shape="circle" className="h-6 w-6" />
            <div className="flex-1">
              <Skeleton shape="text" className="w-2/3" />
              <Skeleton shape="text" className="mt-1.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (checklist.error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 rounded-card border border-border bg-surface p-5">
        <p className="text-sm font-medium text-text">Checklist gagal dimuat</p>
        <p className="text-[13px] text-text-secondary">{checklist.error}</p>
        <Button variant="outline" size="sm" onClick={() => void checklist.reload()} className="mt-1">
          Muat ulang
        </Button>
      </div>
    );
  }

  if (!data || data.tasks.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface">
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" aria-hidden />}
          title="Belum ada checklist onboarding"
          description={`${employee.full_name} belum memiliki checklist. Buat dari template standar perusahaan.`}
          actionLabel="Buat checklist"
          onAction={onRequestGenerate}
        />
      </div>
    );
  }

  const done = data.tasks.filter(isTaskDone).length;
  const total = data.tasks.length;
  const pct = data.progress_pct;

  const groups = React.useMemo(() => {
    const map = new Map<string, ChecklistTask[]>();
    for (const t of data.tasks) {
      const g = taskGroup(t, employee.join_date ?? null);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(t);
    }
    return Array.from(map.entries()).sort(([a], [b]) => groupOrder(a) - groupOrder(b));
  }, [data.tasks, employee.join_date]);

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <section
        aria-label="Progress onboarding"
        className="rounded-card border border-border bg-surface p-5"
      >
        <p className="text-sm font-medium text-text">
          Progress {pct}% ({done} dari {total} tugas)
        </p>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress onboarding ${employee.full_name}: ${pct} persen`}
          className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      {toggleError && (
        <p role="alert" className="text-[13px] text-danger-text">
          {toggleError}
        </p>
      )}

      {/* Kelompok tugas */}
      {groups.map(([name, tasks]) => (
        <section key={name} aria-label={name}>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text">
            <ListChecks className="h-4 w-4 text-text-tertiary" aria-hidden />
            {name}
            <span className="tnum text-xs font-normal text-text-tertiary">
              ({tasks.filter(isTaskDone).length}/{tasks.length})
            </span>
          </h2>
          <ul className="flex flex-col gap-2">
            {tasks.map((t) => (
              <TaskRow
                key={String(t.id)}
                task={t}
                onToggle={handleToggle}
                toggling={togglingId === t.id}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ---------------- Dialog buat checklist ---------------- */

function GenerateDialog({
  open,
  employeeName,
  onClose,
  onConfirm,
  confirming,
  error,
}: {
  open: boolean;
  employeeName: string;
  onClose: () => void;
  onConfirm: () => void;
  confirming: boolean;
  error: string | null;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Buat checklist onboarding"
      description={`Buat checklist onboarding untuk ${employeeName} dari template?`}
    >
      <p className="text-sm text-text-secondary">
        Tugas-tugas standar sesuai departemen akan dibuatkan dan bisa disesuaikan
        setelahnya.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-danger-text">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={confirming}>
          Batal
        </Button>
        <Button onClick={onConfirm} loading={confirming}>
          <Plus className="h-4 w-4" aria-hidden />
          Buat checklist
        </Button>
      </div>
    </Dialog>
  );
}

/* ---------------- Tab Onboarding ---------------- */

export function OnboardingTab() {
  const employees = useApi(() =>
    api.get<EmployeeOption[] | Paged<EmployeeOption>>("/employees", {
      query: { per_page: 100 },
    }),
  );
  const [selectedId, setSelectedId] = React.useState("");
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [generateError, setGenerateError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  const options = React.useMemo(() => {
    const raw = employees.data;
    const list = Array.isArray(raw) ? raw : (raw?.items ?? []);
    return candidateEmployees(list);
  }, [employees.data]);

  const selected = options.find((e) => e.id === selectedId) ?? null;

  async function handleGenerate() {
    if (!selected) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      await api.post(`/onboarding/${selected.id}/generate`, {});
      setGenerateOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Gagal membuat checklist.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Onboarding"
        description="Pantau progres checklist onboarding karyawan baru per tahapan."
        actions={
          <Button
            onClick={() => {
              setGenerateError(null);
              setGenerateOpen(true);
            }}
            disabled={!selected}
            title={selected ? "Buat checklist dari template" : "Pilih karyawan terlebih dahulu"}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Buat checklist
          </Button>
        }
      />

      {/* Pilih karyawan */}
      <div className="mb-6 max-w-md">
        <Label htmlFor="onboarding-employee" className="mb-1.5">
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
            id="onboarding-employee"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
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

      {/* Konten */}
      {selected ? (
        <OnboardingChecklist
          key={`${selected.id}-${reloadKey}`}
          employee={selected}
          onRequestGenerate={() => {
            setGenerateError(null);
            setGenerateOpen(true);
          }}
        />
      ) : (
        !employees.loading && (
          <div className="rounded-card border border-border bg-surface">
            <EmptyState
              icon={<ListChecks className="h-6 w-6" aria-hidden />}
              title="Pilih karyawan"
              description="Pilih karyawan dari daftar untuk melihat progres checklist onboarding-nya."
            />
          </div>
        )
      )}

      {selected && (
        <GenerateDialog
          open={generateOpen}
          employeeName={selected.full_name}
          onClose={() => setGenerateOpen(false)}
          onConfirm={handleGenerate}
          confirming={generating}
          error={generateError}
        />
      )}
    </div>
  );
}
