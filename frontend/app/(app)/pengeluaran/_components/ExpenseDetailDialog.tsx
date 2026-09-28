"use client";

import { Dialog } from "@/components/ui/Dialog";
import { formatDate, formatRupiah } from "@/lib/format";
import { expenseTypeLabel, type ExpenseItem } from "./types";
import { ExpenseStatusBadge, ReceiptPreview } from "./helpers";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-[13px] text-text-secondary">{label}</dt>
      <dd className="text-right text-sm font-medium text-text">{value}</dd>
    </div>
  );
}

function ExpenseDetailDialog({
  expense,
  onClose,
}: {
  expense: ExpenseItem | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={expense !== null}
      onClose={onClose}
      title="Detail klaim"
      description={expense ? `Diajukan ${formatDate(expense.created_at ?? expense.claim_date)}` : undefined}
    >
      {expense && (
        <div>
          <dl className="divide-y divide-border rounded-control border border-border px-4">
            <DetailRow label="Tanggal" value={formatDate(expense.claim_date)} />
            <DetailRow label="Tipe" value={expenseTypeLabel(expense.type)} />
            <DetailRow
              label="Nominal"
              value={<span className="tnum">{formatRupiah(expense.amount)}</span>}
            />
            <DetailRow label="Status" value={<ExpenseStatusBadge status={expense.status} />} />
            {expense.rejection_reason && (
              <DetailRow
                label="Alasan penolakan"
                value={<span className="font-normal">{expense.rejection_reason}</span>}
              />
            )}
            {expense.description && (
              <div className="py-2.5">
                <dt className="text-[13px] text-text-secondary">Deskripsi</dt>
                <dd className="mt-1 text-sm text-text">{expense.description}</dd>
              </div>
            )}
          </dl>

          <div className="mt-4">
            <p className="mb-2 text-[13px] font-medium text-text-secondary">Struk</p>
            <ReceiptPreview url={expense.receipt_url} />
          </div>
        </div>
      )}
    </Dialog>
  );
}

export { ExpenseDetailDialog };
