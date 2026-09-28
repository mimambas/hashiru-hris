"use client";

import * as React from "react";
import { LogIn, LogOut } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatTodayLong } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusDot } from "@/components/ui/StatusDot";
import { AttendanceBadge, ErrorBlock, attendanceMeta, formatTime } from "./helpers";
import type { TodayAttendance } from "./types";

/**
 * Kartu absensi hari ini: jam masuk/keluar, status, tombol
 * check-in/check-out besar dengan dialog konfirmasi.
 */
export function TodayCard() {
  const { data, error, loading, reload } = useApi<TodayAttendance | null>(() =>
    api.get<TodayAttendance | null>("/attendance/today").catch((err) => {
      // 404 = belum ada record hari ini → anggap kosong, bukan error.
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }),
  );

  const [confirm, setConfirm] = React.useState<"in" | "out" | null>(null);
  const [acting, setActing] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  async function handleConfirm() {
    if (!confirm) return;
    setActing(true);
    setActionError(null);
    try {
      if (confirm === "in") await api.post("/attendance/check-in", {});
      else await api.post("/attendance/check-out", {});
      setConfirm(null);
      await reload();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Gagal mencatat absensi. Coba lagi.",
      );
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <Card role="status" aria-label="Memuat absensi hari ini">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton shape="text" className="w-40" />
            <Skeleton shape="text" className="h-8 w-56" />
          </div>
          <Skeleton shape="block" className="h-12 w-40" />
        </div>
      </Card>
    );
  }

  if (error) return <ErrorBlock message={error} onRetry={reload} />;

  const record = data;
  const checkedIn = !!record?.check_in;
  const checkedOut = !!record?.check_out;
  const meta = attendanceMeta(record?.status);

  return (
    <Card aria-label="Absensi hari ini">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-text-secondary">Absensi hari ini</p>
          <p className="tnum mt-1 text-lg font-semibold text-text">{formatTodayLong()}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <p className="text-xs text-text-tertiary">Jam masuk</p>
              <p className="tnum text-xl font-semibold text-text">{formatTime(record?.check_in)}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Jam keluar</p>
              <p className="tnum text-xl font-semibold text-text">{formatTime(record?.check_out)}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Status</p>
              <div className="mt-1">
                {checkedIn ? (
                  <AttendanceBadge status={record?.status} />
                ) : (
                  <StatusDot variant="neutral" label="Belum check-in" />
                )}
              </div>
            </div>
            {record?.late_minutes !== null && record?.late_minutes !== undefined && record.late_minutes > 0 && (
              <div>
                <p className="text-xs text-text-tertiary">Keterlambatan</p>
                <p className="tnum text-xl font-semibold text-warning-text">
                  {record.late_minutes} mnt
                </p>
              </div>
            )}
          </div>
          {actionError && (
            <p role="alert" className="mt-3 text-sm text-danger-text">
              {actionError}
            </p>
          )}
        </div>

        <div className="shrink-0">
          {!checkedIn && (
            <Button size="lg" onClick={() => setConfirm("in")} className="w-full sm:w-auto">
              <LogIn className="h-5 w-5" aria-hidden />
              Check-in
            </Button>
          )}
          {checkedIn && !checkedOut && (
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setConfirm("out")}
              className="w-full sm:w-auto"
            >
              <LogOut className="h-5 w-5" aria-hidden />
              Check-out
            </Button>
          )}
          {checkedIn && checkedOut && (
            <p className="text-sm text-text-secondary" role="status">
              Absensi hari ini selesai. Terima kasih.
            </p>
          )}
        </div>
      </div>

      <Dialog
        open={confirm !== null}
        onClose={() => (acting ? undefined : setConfirm(null))}
        title={confirm === "in" ? "Konfirmasi check-in" : "Konfirmasi check-out"}
        description={
          confirm === "in"
            ? "Waktu check-in akan dicatat sekarang dan tidak dapat diubah sendiri."
            : "Waktu check-out akan dicatat sekarang dan menutup absensi hari ini."
        }
      >
        {actionError && (
          <p role="alert" className="mb-4 rounded-control border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger-text">
            {actionError}
          </p>
        )}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirm(null)} disabled={acting}>
            Batal
          </Button>
          <Button onClick={handleConfirm} loading={acting}>
            {confirm === "in" ? "Ya, check-in" : "Ya, check-out"}
          </Button>
        </div>
      </Dialog>

      <span className="sr-only">Status kehadiran: {meta.label}</span>
    </Card>
  );
}
