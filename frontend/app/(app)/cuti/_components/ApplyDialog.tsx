"use client";

import * as React from "react";
import { Paperclip } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import {
  countWorkingDays,
  leaveTypeLabel,
  rangesOverlap,
  toISODate,
} from "./helpers";
import type { LeaveBalance, LeaveRequest, LeaveTypeSetting } from "./types";

/**
 * Form pengajuan cuti: tipe (dengan sisa saldo), rentang tanggal,
 * alasan, dan lampiran (wajib untuk cuti sakit > 2 hari).
 */
export function ApplyDialog({
  open,
  onClose,
  onSaved,
  balances,
  leaveTypes,
  existing,
  employeeId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  balances: LeaveBalance[];
  leaveTypes: LeaveTypeSetting[];
  existing: LeaveRequest[];
  employeeId: string | null;
}) {
  const today = React.useMemo(() => toISODate(new Date()), []);
  const [leaveType, setLeaveType] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLeaveType("");
    setStartDate("");
    setEndDate("");
    setReason("");
    setFile(null);
    setErrors({});
    setSubmitError(null);
    setSaving(false);
  }, [open ]);

  const balance = React.useMemo(
    () => balances.find((b) => b.leave_type.toUpperCase() === leaveType.toUpperCase()),
    [balances, leaveType],
  );

  const workingDays = React.useMemo(
    () => (startDate && endDate ? countWorkingDays(startDate, endDate) : 0),
    [startDate, endDate],
  );

  const needsAttachment = leaveType.toUpperCase() === "SL" && workingDays > 2;

  const typeOptions = React.useMemo(() => {
    const fromSettings = leaveTypes.map((t) => t.code.toUpperCase());
    const fromBalances = balances.map((b) => b.leave_type.toUpperCase());
    return Array.from(new Set([...fromSettings, ...fromBalances]));
  }, [leaveTypes, balances]);

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!leaveType) errs.leaveType = "Pilih tipe cuti";
    if (!startDate) errs.startDate = "Pilih tanggal mulai cuti";
    if (!endDate) errs.endDate = "Pilih tanggal selesai cuti";
    if (startDate && endDate && endDate < startDate)
      errs.endDate = "Tanggal selesai tidak boleh sebelum tanggal mulai";
    if (!reason.trim()) errs.reason = "Tulis alasan pengajuan cuti";
    if (startDate && endDate && endDate >= startDate) {
      const clash = existing.find(
        (r) =>
          (r.status === "pending" || r.status === "approved") &&
          rangesOverlap(startDate, endDate, r.start_date.slice(0, 10), r.end_date.slice(0, 10)),
      );
      if (clash)
        errs.startDate = `Bertabrakan dengan pengajuan ${leaveTypeLabel(clash.leave_type)} pada ${clash.start_date.slice(0, 10)} – ${clash.end_date.slice(0, 10)}`;
    }
    if (balance && workingDays > balance.remaining_days)
      errs.endDate = `Durasi ${workingDays} hari kerja melebihi sisa saldo ${balance.remaining_days} hari`;
    if (needsAttachment && !file)
      errs.file = "Lampiran wajib untuk cuti sakit lebih dari 2 hari (cth. surat dokter)";
    return errs;
  }

  async function uploadAttachment(): Promise<string | null> {
    if (!file) return null;
    if (!employeeId) throw new Error("Profil karyawan tidak terhubung, lampiran tidak dapat diunggah");
    if (file.size > 10 * 1024 * 1024) throw new Error("Ukuran lampiran maksimal 10 MB");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("employee_id", employeeId);
    fd.append("category", "personal");
    fd.append("name", `Lampiran cuti - ${file.name}`);
    const res = (await api.upload("/documents/upload", fd)) as Record<string, unknown>;
    const url = res.file_url ?? res.url ?? res.path;
    if (typeof url !== "string" || !url) throw new Error("Unggahan lampiran tidak mengembalikan tautan berkas");
    return url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setSubmitError(null);
    if (Object.keys(errs).length > 0) {
      const order = ["leaveType", "startDate", "endDate", "reason", "file"];
      const first = order.find((k) => errs[k]);
      document.getElementById(`leave-${first}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      const attachmentUrl = await uploadAttachment();
      await api.post("/leave-requests", {
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
        attachment_url: attachmentUrl,
      });
      onSaved();
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message
        : err instanceof Error ? err.message
        : "Gagal mengajukan cuti. Coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Ajukan cuti"
      description="Lengkapi formulir pengajuan. Pengajuan diteruskan ke atasan untuk persetujuan."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {submitError && (
          <p role="alert" className="rounded-control border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger-text">
            {submitError}
          </p>
        )}

        <div>
          <Label htmlFor="leave-leaveType" className="mb-1.5">
            Tipe cuti <span className="text-danger" aria-hidden>*</span>
          </Label>
          <Select
            id="leave-leaveType"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            invalid={!!errors.leaveType}
            aria-describedby={balance ? "leave-balance-hint" : undefined}
          >
            <option value="">Pilih tipe cuti</option>
            {typeOptions.map((code) => (
              <option key={code} value={code}>
                {leaveTypeLabel(code)}
              </option>
            ))}
          </Select>
          {errors.leaveType && <p role="alert" className="mt-1 text-xs text-danger-text">{errors.leaveType}</p>}
          {balance && !errors.leaveType && (
            <p id="leave-balance-hint" className="tnum mt-1 text-xs text-text-secondary">
              Sisa saldo: {balance.remaining_days} dari {balance.total_days} hari
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="leave-startDate" className="mb-1.5">
              Tanggal mulai <span className="text-danger" aria-hidden>*</span>
            </Label>
            <Input
              id="leave-startDate"
              type="date"
              value={startDate}
              min={today}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (endDate && e.target.value > endDate) setEndDate(e.target.value);
              }}
              invalid={!!errors.startDate}
            />
            {errors.startDate && <p role="alert" className="mt-1 text-xs text-danger-text">{errors.startDate}</p>}
          </div>
          <div>
            <Label htmlFor="leave-endDate" className="mb-1.5">
              Tanggal selesai <span className="text-danger" aria-hidden>*</span>
            </Label>
            <Input
              id="leave-endDate"
              type="date"
              value={endDate}
              min={startDate || today}
              onChange={(e) => setEndDate(e.target.value)}
              invalid={!!errors.endDate}
            />
            {errors.endDate && <p role="alert" className="mt-1 text-xs text-danger-text">{errors.endDate}</p>}
          </div>
        </div>
        {workingDays > 0 && !errors.endDate && (
          <p className="tnum -mt-2 text-xs text-text-secondary" role="status">
            Durasi: {workingDays} hari kerja (di luar Sabtu–Minggu)
          </p>
        )}

        <div>
          <Label htmlFor="leave-reason" className="mb-1.5">
            Alasan <span className="text-danger" aria-hidden>*</span>
          </Label>
          <textarea
            id="leave-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="cth. Keperluan keluarga di luar kota"
            aria-invalid={!!errors.reason}
            className="flex w-full rounded-control border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-text-tertiary transition-[border-color] sm:text-sm"
            style={errors.reason ? { borderColor: "var(--danger)" } : undefined}
          />
          {errors.reason && <p role="alert" className="mt-1 text-xs text-danger-text">{errors.reason}</p>}
        </div>

        <div>
          <Label htmlFor="leave-file" className="mb-1.5">
            Lampiran {needsAttachment && <span className="text-danger" aria-hidden>*</span>}
          </Label>
          <div className="flex items-center gap-2">
            <label
              htmlFor="leave-file"
              className="flex h-10 cursor-pointer items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm text-text transition-colors hover:bg-muted"
            >
              <Paperclip className="h-4 w-4 text-text-tertiary" aria-hidden />
              {file ? file.name : "Pilih berkas"}
            </label>
            {file && (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-xs text-text-secondary underline-offset-2 hover:underline"
              >
                Hapus
              </button>
            )}
          </div>
          <input
            id="leave-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-text-tertiary">
            {needsAttachment
              ? "Wajib: surat keterangan dokter untuk cuti sakit lebih dari 2 hari."
              : "Opsional. PDF/JPG/PNG, maksimal 10 MB."}
          </p>
          {errors.file && <p role="alert" className="mt-1 text-xs text-danger-text">{errors.file}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            Ajukan cuti
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
