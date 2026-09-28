"use client";

import * as React from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { toISODate } from "./helpers";
import type { EmployeeOption } from "./types";

/**
 * Dialog input absensi manual (HR): karyawan, tanggal,
 * jam masuk/keluar, dan alasan.
 */
export function ManualDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = React.useMemo(() => toISODate(new Date()), []);
  const [employees, setEmployees] = React.useState<EmployeeOption[]>([]);
  const [employeeId, setEmployeeId] = React.useState("");
  const [date, setDate] = React.useState(today);
  const [checkIn, setCheckIn] = React.useState("");
  const [checkOut, setCheckOut] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setEmployeeId("");
    setDate(today);
    setCheckIn("");
    setCheckOut("");
    setReason("");
    setErrors({});
    setSubmitError(null);
    setSaving(false);
    void api
      .get<EmployeeOption[] | { items?: EmployeeOption[] }>("/employees", {
        query: { per_page: 100, status: "active" },
      })
      .then((r) => setEmployees(Array.isArray(r) ? r : (r.items ?? [])))
      .catch(() => setEmployees([]));
  }, [open, today]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!employeeId) errs.employeeId = "Pilih karyawan";
    if (!date) errs.date = "Pilih tanggal";
    if (!checkIn) errs.checkIn = "Isi jam masuk";
    if (!reason.trim()) errs.reason = "Alasan wajib diisi untuk input manual";
    if (checkIn && checkOut && checkOut <= checkIn)
      errs.checkOut = "Jam keluar harus setelah jam masuk";
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const first = ["employeeId", "date", "checkIn", "checkOut", "reason"].find((k) => errs[k]);
      document.getElementById(`manual-${first}`)?.focus();
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      await api.post("/attendance/manual", {
        employee_id: employeeId,
        date,
        check_in: `${date}T${checkIn}:00`,
        check_out: checkOut ? `${date}T${checkOut}:00` : null,
        reason: reason.trim(),
      });
      onSaved();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Gagal menyimpan absensi manual. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Input absensi manual"
      description="Catat kehadiran karyawan secara manual. Data akan ditandai sebagai input manual."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {submitError && (
          <p role="alert" className="rounded-control border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger-text">
            {submitError}
          </p>
        )}
        <div>
          <Label htmlFor="manual-employeeId" className="mb-1.5">
            Karyawan <span className="text-danger" aria-hidden>*</span>
          </Label>
          <Select
            id="manual-employeeId"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            invalid={!!errors.employeeId}
          >
            <option value="">Pilih karyawan</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name}
              </option>
            ))}
          </Select>
          {errors.employeeId && <p role="alert" className="mt-1 text-xs text-danger-text">{errors.employeeId}</p>}
        </div>
        <div>
          <Label htmlFor="manual-date" className="mb-1.5">
            Tanggal <span className="text-danger" aria-hidden>*</span>
          </Label>
          <Input
            id="manual-date"
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            invalid={!!errors.date}
          />
          {errors.date && <p role="alert" className="mt-1 text-xs text-danger-text">{errors.date}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="manual-checkIn" className="mb-1.5">
              Jam masuk <span className="text-danger" aria-hidden>*</span>
            </Label>
            <Input
              id="manual-checkIn"
              type="time"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              invalid={!!errors.checkIn}
            />
            {errors.checkIn && <p role="alert" className="mt-1 text-xs text-danger-text">{errors.checkIn}</p>}
          </div>
          <div>
            <Label htmlFor="manual-checkOut" className="mb-1.5">Jam keluar</Label>
            <Input
              id="manual-checkOut"
              type="time"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              invalid={!!errors.checkOut}
            />
            {errors.checkOut && <p role="alert" className="mt-1 text-xs text-danger-text">{errors.checkOut}</p>}
          </div>
        </div>
        <div>
          <Label htmlFor="manual-reason" className="mb-1.5">
            Alasan <span className="text-danger" aria-hidden>*</span>
          </Label>
          <textarea
            id="manual-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="cth. Lupa check-in karena dinas luar kota"
            aria-invalid={!!errors.reason}
            aria-describedby={errors.reason ? "manual-reason-error" : undefined}
            className="flex w-full rounded-control border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-text-tertiary transition-[border-color] sm:text-sm"
            style={errors.reason ? { borderColor: "var(--danger)" } : undefined}
          />
          {errors.reason && (
            <p id="manual-reason-error" role="alert" className="mt-1 text-xs text-danger-text">{errors.reason}</p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            Simpan absensi
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
