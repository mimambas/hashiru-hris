"use client";

import * as React from "react";
import { Check, CheckCheck, ReceiptText, X } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatDate, formatRupiah } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { expenseTypeLabel, type ExpenseItem } from "./types";
import {
  asRows,
  ErrorBlock,
  ExpenseStatusBadge,
  Field,
  normalizeExpense,
  ReceiptPreview,
} from "./helpers";

const TEXTAREA_CLASS =
  "flex min-h-24 w-full rounded-control border border-border bg-surface px-3 py-2 text-base sm:text-sm text-text placeholder:text-text-tertiary";

interface BulkFailure {
  label: string;
  message: string;
}

function ApprovalTab() {
  const claims = useApi(() => api.get<unknown>("/expenses", { query: { status: "pending" } }));
  const items = React.useMemo(() => asRows(claims.data).map(normalizeExpense), [claims.data]);

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [approvingId, setApprovingId] = React.useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<ExpenseItem | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [rejectError, setRejectError] = React.useState<string | null>(null);
  const [rejecting, setRejecting] = React.useState(false);

  const [bulkRunning, setBulkRunning] = React.useState(false);
  const [bulkProgress, setBulkProgress] = React.useState({ done: 0, total: 0 });
  const [bulkSummary, setBulkSummary] = React.useState<{
    success: number;
    failures: BulkFailure[];
  } | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Bersihkan pilihan yang sudah tidak ada di daftar setelah reload.
  React.useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(items.map((i) => i.id));
      const kept = Array.from(prev).filter((id) => ids.has(id));
      const next = new Set(kept);
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const allSelected = items.length > 0 && selected.size === items.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  }

  async function approveOne(id: string): Promise<void> {
    await api.put(`/expenses/${id}/approve`, {});
  }

  async function handleApprove(item: ExpenseItem) {
    setApprovingId(item.id);
    setActionError(null);
    try {
      await approveOne(item.id);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      await claims.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal menyetujui klaim.");
    } finally {
      setApprovingId(null);
    }
  }

  function openReject(item: ExpenseItem) {
    setRejectTarget(item);
    setRejectReason("");
    setRejectError(null);
  }

  async function handleReject() {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setRejectError("Tulis alasan penolakan");
      document.getElementById("reject-alasan")?.focus();
      return;
    }
    setRejecting(true);
    try {
      await api.put(`/expenses/${rejectTarget.id}/reject`, { reason: rejectReason.trim() });
      setRejectTarget(null);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(rejectTarget.id);
        return next;
      });
      await claims.reload();
    } catch (err) {
      setRejectError(err instanceof Error ? err.message : "Gagal menolak klaim. Coba lagi.");
    } finally {
      setRejecting(false);
    }
  }

  async function handleBulkApprove() {
    const targets = items.filter((i) => selected.has(i.id));
    if (targets.length === 0) return;
    setBulkRunning(true);
    setBulkSummary(null);
    setActionError(null);
    setBulkProgress({ done: 0, total: targets.length });
    const failures: BulkFailure[] = [];
    let success = 0;
    for (const item of targets) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await approveOne(item.id);
        success += 1;
      } catch (err) {
        failures.push({
          label: `${formatRupiah(item.amount)} · ${expenseTypeLabel(item.type)}`,
          message: err instanceof Error ? err.message : "Gagal menyetujui.",
        });
      }
      setBulkProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setBulkSummary({ success, failures });
    setSelected(new Set());
    setBulkRunning(false);
    await claims.reload();
  }

  const busy = bulkRunning || approvingId !== null;

  return (
    <div className="flex flex-col gap-4">
      {/* Bilah aksi massal */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-text">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={items.length === 0 || busy}
            className="h-4 w-4 rounded accent-accent"
            aria-label="Pilih semua klaim"
          />
          Pilih semua
          {selected.size > 0 && (
            <Badge variant="info">{selected.size} dipilih</Badge>
          )}
        </label>
        <Button
          size="sm"
          onClick={() => void handleBulkApprove()}
          loading={bulkRunning}
          disabled={selected.size === 0 || busy}
        >
          <CheckCheck className="h-4 w-4" aria-hidden />
          {bulkRunning
            ? `Menyetujui ${bulkProgress.done} dari ${bulkProgress.total}`
            : `Setujui terpilih (${selected.size})`}
        </Button>
      </div>

      {actionError && (
        <p role="alert" className="text-[13px] text-danger-text">
          {actionError}
        </p>
      )}

      {bulkSummary && (
        <div
          role="status"
          className="rounded-card border border-border bg-surface px-4 py-3 text-sm"
        >
          <p className="font-medium text-text">
            Berhasil menyetujui {bulkSummary.success} klaim
            {bulkSummary.failures.length > 0 && `, ${bulkSummary.failures.length} gagal`}
          </p>
          {bulkSummary.failures.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {bulkSummary.failures.map((f, i) => (
                <li key={i} className="text-[13px] text-text-secondary">
                  <span className="tnum font-medium text-text">{f.label}</span> — {f.message}
                </li>
              ))}
            </ul>
          )}
          <Button variant="ghost" size="sm" className="mt-1 -ml-2" onClick={() => setBulkSummary(null)}>
            Tutup ringkasan
          </Button>
        </div>
      )}

      {/* Daftar klaim */}
      {claims.loading ? (
        <div className="flex flex-col gap-3" aria-label="Memuat klaim menunggu persetujuan">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-4">
                <Skeleton shape="circle" className="h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <Skeleton shape="text" className="w-48" />
                  <Skeleton shape="text" className="mt-2 w-32" />
                </div>
                <Skeleton className="h-16 w-16 shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      ) : claims.error ? (
        <ErrorBlock message={claims.error} onRetry={() => void claims.reload()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ReceiptText className="h-6 w-6" aria-hidden />}
          title="Tidak ada klaim menunggu persetujuan"
          description="Semua klaim sudah diproses. Klaim baru yang masuk akan tampil di sini."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggle(item.id)}
                    disabled={busy}
                    className="mt-1 h-4 w-4 shrink-0 rounded accent-accent"
                    aria-label={`Pilih klaim ${expenseTypeLabel(item.type)} ${formatRupiah(item.amount)}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="text-sm font-semibold text-text">
                        {item.employee_name ?? "Karyawan"}
                      </p>
                      <ExpenseStatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 text-[13px] text-text-secondary">
                      {formatDate(item.claim_date)} · {expenseTypeLabel(item.type)}
                    </p>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{item.description}</p>
                    )}
                    <p className="tnum mt-1.5 text-base font-semibold text-text">
                      {formatRupiah(item.amount)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => void handleApprove(item)}
                        loading={approvingId === item.id}
                        disabled={busy}
                      >
                        <Check className="h-4 w-4" aria-hidden />
                        Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReject(item)}
                        disabled={busy}
                        className="text-danger-text hover:bg-danger-soft"
                      >
                        <X className="h-4 w-4" aria-hidden />
                        Tolak
                      </Button>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <ReceiptPreview url={item.receipt_url} size="sm" />
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* Dialog tolak */}
      <Dialog
        open={rejectTarget !== null}
        onClose={() => (rejecting ? undefined : setRejectTarget(null))}
        title="Tolak klaim"
        description={
          rejectTarget
            ? `${rejectTarget.employee_name ?? "Karyawan"} · ${expenseTypeLabel(rejectTarget.type)} · ${formatRupiah(rejectTarget.amount)}`
            : undefined
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Alasan penolakan" htmlFor="reject-alasan" required error={rejectError}>
            <textarea
              placeholder="Contoh: Struk tidak jelas, ajukan ulang dengan foto yang terbaca"
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (rejectError) setRejectError(null);
              }}
              rows={3}
              className={TEXTAREA_CLASS}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={rejecting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={() => void handleReject()} loading={rejecting}>
              <X className="h-4 w-4" aria-hidden />
              Tolak klaim
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export { ApprovalTab };
