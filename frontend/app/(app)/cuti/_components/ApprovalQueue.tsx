"use client";

import * as React from "react";
import { Check, Inbox, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Label } from "@/components/ui/Label";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  ErrorBlock,
  UrgencyBadge,
  formatRange,
  isUrgent,
  leaveTypeLabel,
} from "./helpers";
import type { LeaveRequest } from "./types";

function asList(res: unknown): LeaveRequest[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as LeaveRequest[];
  return ((res as { items?: LeaveRequest[] }).items ?? []);
}

/* ---------------- Dialog tolak (alasan wajib) ---------------- */

function RejectDialog({
  target,
  onClose,
  onDone,
}: {
  target: LeaveRequest | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (target) {
      setReason("");
      setError(null);
      setSaving(false);
    }
  }, [target]);

  async function handleReject() {
    if (!target) return;
    if (!reason.trim()) {
      setError("Tulis alasan penolakan agar karyawan memahaminya");
      document.getElementById("reject-reason")?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.put(`/leave-requests/${target.id}/reject`, { reason: reason.trim() });
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menolak pengajuan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      title="Tolak pengajuan cuti"
      description={
        target
          ? `Pengajuan ${leaveTypeLabel(target.leave_type)} oleh ${target.employee?.full_name ?? "karyawan"} akan ditolak.`
          : undefined
      }
    >
      {error && (
        <p role="alert" className="mb-4 rounded-control border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger-text">
          {error}
        </p>
      )}
      <div className="mb-4">
        <Label htmlFor="reject-reason" className="mb-1.5">
          Alasan penolakan <span className="text-danger" aria-hidden>*</span>
        </Label>
        <textarea
          id="reject-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="cth. Jadwal cuti bertabrakan dengan tenggat proyek"
          aria-invalid={!!error}
          className="flex w-full rounded-control border border-border bg-surface px-3 py-2 text-base text-text placeholder:text-text-tertiary sm:text-sm"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Batal
        </Button>
        <Button variant="destructive" onClick={handleReject} loading={saving}>
          Tolak pengajuan
        </Button>
      </div>
    </Dialog>
  );
}

/* ---------------- Antrean ---------------- */

export function ApprovalQueue() {
  const { data, error, loading, reload } = useApi<unknown>(() =>
    api.get("/leave-requests", { query: { status: "pending", per_page: 100 } }),
  );
  const [rejectTarget, setRejectTarget] = React.useState<LeaveRequest | null>(null);
  const [actingId, setActingId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const items = React.useMemo(
    () =>
      asList(data)
        .filter((r) => r.status === "pending")
        .sort((a, b) => {
          const ua = isUrgent(a.start_date, a.status) ? 0 : 1;
          const ub = isUrgent(b.start_date, b.status) ? 0 : 1;
          return ua - ub || a.start_date.localeCompare(b.start_date);
        }),
    [data],
  );

  async function handleApprove(id: string) {
    setActingId(id);
    setActionError(null);
    try {
      await api.put(`/leave-requests/${id}/approve`, {});
      await reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Gagal menyetujui pengajuan. Coba lagi.");
    } finally {
      setActingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Memuat antrean persetujuan">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <div className="flex items-center gap-3">
              <Skeleton shape="circle" className="h-10 w-10" />
              <div className="flex-1 space-y-1.5">
                <Skeleton shape="text" className="w-1/3" />
                <Skeleton shape="text" className="w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) return <ErrorBlock message={error} onRetry={reload} />;

  if (items.length === 0) {
    return (
      <Card className="p-0">
        <EmptyState
          icon={<Inbox className="h-6 w-6" aria-hidden />}
          title="Tidak ada pengajuan menunggu"
          description="Semua pengajuan cuti sudah diproses."
        />
      </Card>
    );
  }

  return (
    <div>
      {actionError && (
        <p role="alert" className="mb-3 rounded-control border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger-text">
          {actionError}
        </p>
      )}
      <ul className="space-y-3" aria-label="Antrean persetujuan cuti">
        {items.map((r) => {
          const urgent = isUrgent(r.start_date, r.status);
          const name = r.employee?.full_name ?? "—";
          return (
            <li key={r.id}>
              <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar name={name} size="md" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-text">{name}</p>
                        {urgent && <UrgencyBadge />}
                      </div>
                      <p className="mt-0.5 text-[13px] text-text-secondary">
                        {r.employee?.position?.title ?? ""}
                        {r.employee?.department?.name ? ` · ${r.employee.department.name}` : ""}
                      </p>
                      <p className="tnum mt-1.5 text-sm text-text">
                        <strong className="font-medium">{leaveTypeLabel(r.leave_type)}</strong>
                        {" · "}
                        {formatRange(r.start_date, r.end_date)}
                        {r.total_days !== null && r.total_days !== undefined && (
                          <span className="text-text-secondary"> ({r.total_days} hari)</span>
                        )}
                      </p>
                      {r.reason && (
                        <p className="mt-1 text-[13px] text-text-secondary">
                          Alasan: {r.reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(r.id)}
                      loading={actingId === r.id}
                      disabled={actingId !== null}
                    >
                      <Check className="h-4 w-4" aria-hidden />
                      Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectTarget(r)}
                      disabled={actingId !== null}
                      className="hover:text-danger"
                    >
                      <X className="h-4 w-4" aria-hidden />
                      Tolak
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <RejectDialog
        target={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onDone={reload}
      />
    </div>
  );
}
