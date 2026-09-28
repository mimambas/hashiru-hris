"use client";

import * as React from "react";
import { Plus, ReceiptText } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { formatDate, formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/Table";
import { ApprovalTab } from "./_components/ApprovalTab";
import { ClaimDialog } from "./_components/ClaimDialog";
import { ExpenseDetailDialog } from "./_components/ExpenseDetailDialog";
import { asRows, ErrorBlock, ExpenseStatusBadge, normalizeExpense } from "./_components/helpers";
import { expenseTypeLabel, type ExpenseItem } from "./_components/types";

const STATUS_OPTIONS = [
  { value: "semua", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
];

function ClaimsTable({
  items,
  onSelect,
}: {
  items: ExpenseItem[];
  onSelect: (item: ExpenseItem) => void;
}) {
  return (
    <TableWrapper className="rounded-card border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead numeric>Nominal</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              onClick={() => onSelect(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(item);
                }
              }}
              tabIndex={0}
              className="cursor-pointer"
              aria-label={`Lihat detail klaim ${expenseTypeLabel(item.type)} ${formatRupiah(item.amount)}`}
            >
              <TableCell className="whitespace-nowrap">{formatDate(item.claim_date)}</TableCell>
              <TableCell>{expenseTypeLabel(item.type)}</TableCell>
              <TableCell numeric className="whitespace-nowrap">
                {formatRupiah(item.amount)}
              </TableCell>
              <TableCell>
                <ExpenseStatusBadge status={item.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}

function MyClaims({ onCreate }: { onCreate: () => void }) {
  const [statusFilter, setStatusFilter] = React.useState("semua");
  const [detail, setDetail] = React.useState<ExpenseItem | null>(null);

  const claims = useApi(
    () =>
      api.get<unknown>("/expenses", {
        query: { status: statusFilter !== "semua" ? statusFilter : undefined },
      }),
    [statusFilter],
  );
  const items = React.useMemo(() => asRows(claims.data).map(normalizeExpense), [claims.data]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Label htmlFor="klaim-status" className="mb-1.5">
            Status
          </Label>
          <Select
            id="klaim-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {claims.loading ? (
        <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4" aria-label="Memuat klaim">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} shape="text" className={i % 2 === 0 ? "w-3/4" : "w-1/2"} />
          ))}
        </div>
      ) : claims.error ? (
        <ErrorBlock message={claims.error} onRetry={() => void claims.reload()} />
      ) : items.length === 0 ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<ReceiptText className="h-6 w-6" aria-hidden />}
            title="Belum ada klaim pengeluaran"
            description={
              statusFilter === "semua"
                ? "Klaim yang Anda ajukan akan tampil di sini."
                : "Tidak ada klaim dengan status ini. Coba filter lain."
            }
            actionLabel="Ajukan klaim"
            onAction={onCreate}
          />
        </div>
      ) : (
        <ClaimsTable items={items} onSelect={setDetail} />
      )}

      <ExpenseDetailDialog expense={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

export default function PengeluaranPage() {
  const { hasRole: checkRole } = useAuth();
  const canApprove = checkRole(
    "dept_manager",
    "hr_manager",
    "hr_director",
    "finance_officer",
    "super_admin",
  );
  const [tab, setTab] = React.useState("saya");
  const [claimOpen, setClaimOpen] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  const tabs = React.useMemo(
    () => [
      { value: "saya", label: "Klaim saya" },
      ...(canApprove ? [{ value: "persetujuan", label: "Persetujuan" }] : []),
    ],
    [canApprove],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pengeluaran"
        description="Ajukan klaim pengeluaran dan pantau status persetujuannya"
        actions={
          <Button onClick={() => setClaimOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Ajukan klaim
          </Button>
        }
      />

      <Tabs tabs={tabs} value={tab} onChange={setTab} label="Pengeluaran">
        {(value) =>
          value === "persetujuan" && canApprove ? (
            <ApprovalTab key={`approval-${reloadKey}`} />
          ) : (
            <MyClaims
              key={`mine-${reloadKey}`}
              onCreate={() => setClaimOpen(true)}
            />
          )
        }
      </Tabs>

      <ClaimDialog
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        onSubmitted={() => {
          setClaimOpen(false);
          setReloadKey((k) => k + 1);
        }}
      />
    </div>
  );
}
