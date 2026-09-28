"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

interface AttendanceSettings {
  grace_period_minutes?: number;
  work_start?: string;
  work_end?: string;
  overtime_min_minutes?: number;
  max_overtime_hours?: number;
  [key: string]: unknown;
}

function toNum(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toTime(v: unknown, fallback: string): string {
  if (typeof v === "string" && /^\d{2}:\d{2}/.test(v)) return v.slice(0, 5);
  return fallback;
}

export function AttendanceForm() {
  const { data, error, loading, reload } = useApi(() =>
    api.get<AttendanceSettings>("/settings/attendance"),
  );
  const [grace, setGrace] = React.useState("15");
  const [workStart, setWorkStart] = React.useState("08:00");
  const [workEnd, setWorkEnd] = React.useState("17:00");
  const [overtimeMin, setOvertimeMin] = React.useState("60");
  const [maxOvertime, setMaxOvertime] = React.useState("3");
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (data) {
      setGrace(String(toNum(data.grace_period_minutes, 15)));
      setWorkStart(toTime(data.work_start, "08:00"));
      setWorkEnd(toTime(data.work_end, "17:00"));
      setOvertimeMin(String(toNum(data.overtime_min_minutes, 60)));
      setMaxOvertime(String(toNum(data.max_overtime_hours, 3)));
    }
  }, [data]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!/^\d{2}:\d{2}$/.test(workStart)) errs.workStart = "Isi jam mulai dengan format JJ:MM.";
    if (!/^\d{2}:\d{2}$/.test(workEnd)) errs.workEnd = "Isi jam selesai dengan format JJ:MM.";
    if (!/^\d+$/.test(grace)) errs.grace = "Isi toleransi keterlambatan dengan angka menit.";
    if (!/^\d+$/.test(overtimeMin)) errs.overtimeMin = "Isi minimal lembur dengan angka menit.";
    if (!/^\d+(\.\d+)?$/.test(maxOvertime)) errs.maxOvertime = "Isi batas lembur dengan angka jam.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    if (!validate()) return;
    setSaving(true);
    setFormError(null);
    try {
      await api.put("/settings/attendance", {
        grace_period_minutes: Number(grace),
        work_start: workStart,
        work_end: workEnd,
        overtime_min_minutes: Number(overtimeMin),
        max_overtime_hours: Number(maxOvertime),
      });
      setSaved(true);
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card aria-label="Memuat pengaturan absensi">
        <CardHeader>
          <Skeleton shape="text" className="w-48" />
          <Skeleton shape="text" className="mt-1 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <Skeleton shape="text" className="w-32" />
                <Skeleton className="mt-2 h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <div role="alert" className="flex flex-col items-start gap-2 p-6">
          <p className="text-sm font-medium text-text">Pengaturan absensi gagal dimuat</p>
          <p className="text-[13px] text-text-secondary">{error ?? "Data tidak tersedia."}</p>
          <Button variant="outline" size="sm" onClick={() => void reload()} className="mt-1">
            Muat ulang
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aturan absensi</CardTitle>
        <CardDescription>
          Toleransi keterlambatan, jam kerja, dan batas lembur harian.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="att-work-start">Jam mulai kerja</Label>
              <Input
                id="att-work-start"
                type="time"
                value={workStart}
                invalid={!!fieldErrors.workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                className="mt-1.5"
              />
              {fieldErrors.workStart && (
                <p role="alert" className="mt-1.5 text-[13px] text-danger-text">{fieldErrors.workStart}</p>
              )}
            </div>
            <div>
              <Label htmlFor="att-work-end">Jam selesai kerja</Label>
              <Input
                id="att-work-end"
                type="time"
                value={workEnd}
                invalid={!!fieldErrors.workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                className="mt-1.5"
              />
              {fieldErrors.workEnd && (
                <p role="alert" className="mt-1.5 text-[13px] text-danger-text">{fieldErrors.workEnd}</p>
              )}
            </div>
            <div>
              <Label htmlFor="att-grace">Toleransi keterlambatan (menit)</Label>
              <Input
                id="att-grace"
                type="number"
                min={0}
                value={grace}
                invalid={!!fieldErrors.grace}
                onChange={(e) => setGrace(e.target.value)}
                className="mt-1.5"
              />
              {fieldErrors.grace && (
                <p role="alert" className="mt-1.5 text-[13px] text-danger-text">{fieldErrors.grace}</p>
              )}
            </div>
            <div>
              <Label htmlFor="att-ot-min">Minimal lembur tercatat (menit)</Label>
              <Input
                id="att-ot-min"
                type="number"
                min={0}
                value={overtimeMin}
                invalid={!!fieldErrors.overtimeMin}
                onChange={(e) => setOvertimeMin(e.target.value)}
                className="mt-1.5"
              />
              {fieldErrors.overtimeMin && (
                <p role="alert" className="mt-1.5 text-[13px] text-danger-text">{fieldErrors.overtimeMin}</p>
              )}
            </div>
            <div>
              <Label htmlFor="att-ot-max">Batas lembur per hari (jam)</Label>
              <Input
                id="att-ot-max"
                type="number"
                min={0}
                step="0.5"
                value={maxOvertime}
                invalid={!!fieldErrors.maxOvertime}
                onChange={(e) => setMaxOvertime(e.target.value)}
                className="mt-1.5"
              />
              {fieldErrors.maxOvertime && (
                <p role="alert" className="mt-1.5 text-[13px] text-danger-text">{fieldErrors.maxOvertime}</p>
              )}
            </div>
          </div>

          {formError && (
            <p role="alert" className="mt-4 text-[13px] text-danger-text">{formError}</p>
          )}
          {saved && (
            <p role="status" className="mt-4 text-[13px] text-success-text">
              Pengaturan absensi tersimpan.
            </p>
          )}

          <div className="mt-5">
            <Button type="submit" loading={saving}>
              Simpan perubahan
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
