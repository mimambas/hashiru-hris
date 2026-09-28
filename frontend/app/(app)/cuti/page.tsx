"use client";

import * as React from "react";
import { CalendarPlus, Send } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth, type Role } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { cx } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
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
import { ApplyDialog } from "./_components/ApplyDialog";
import { ApprovalQueue } from "./_components/ApprovalQueue";
import { TeamCalendar } from "./_components/TeamCalendar";
import {
  ErrorBlock,
  LeaveStatusBadge,
  formatRange,
  isUrgent,
  leaveTypeLabel,
  UrgencyBadge,
} from "./_components/helpers";
import type { LeaveBalance, LeaveRequest, LeaveTypeSetting } from "./_components/types";

const APPROVER_ROLES: Role[] = [
  "super_admin",
  "hr_director",
  "hr_manager",
  "hr_officer",
  "dept_manager",
  "team_leader",
];

function asList<T>(res: unknown): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  return ((res as { items?: T[] }).items ?? []);
}

/* ---------------- Kartu saldo ---------------- */

function BalanceCards({ balances, loading }: { balances: LeaveBalance[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Memuat saldo cuti">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <Skeleton shape="text" className="w-2/3" />
            <Skeleton shape="text" className="mt-3 h-8 w-1/2" />
            <Skeleton shape="block" className="mt-3 h-2 w-full" />
          </Card>
        ))}
      </div>
    );
  }
  if (balances.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Saldo cuti">
      {balances.map((b) => {
        const pct = b.total_days > 0 ? Math.round((b.remaining_days / b.total_days) * 100) : 0;
        const low = b.remaining_days <= 2;
        return (
          <Card key={`${b.leave_type}-${b.year}`}>
            <p className="text-[13px] font-medium text-text-secondary">
              {leaveTypeLabel(b.leave_type)}
            </p>
            <p className="tnum mt-2 text-2xl font-semibold tracking-tight text-text">
              {b.remaining_days}
              <span className="text-sm font-normal text-text-tertiary"> / {b.total_days} hari</span>
            </p>
            <div
              role="progressbar"
              aria-label={`Sisa ${leaveTypeLabel(b.leave_type)}`}
              aria-valuenow={b.remaining_days}
              aria-valuemin={0}
              aria-valuemax={b.total_days}
              className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className={cx("h-full rounded-full transition-all", low ? "bg-warning" : "bg-accent")}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="tnum mt-2 text-xs text-text-tertiary">
              Terpakai {b.used_days} hari · Tahun {b.year}
            </p>
          </Card>
        );
      })}
    </div>
  );
}

/* ---------------- Daftar pengajuan ---------------- */

function RequestTable({ items, emptyTitle, emptyDescription }: {
  items: LeaveRequest[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (items.length === 0) {
    return (
      <Card className="p-0">
        <EmptyState
          icon={<Send className="h-6 w-6" aria-hidden />}
          title={emptyTitle}
          description={emptyDescription}
        />
      </Card>
    );
  }
  return (
    <Card className="p-0">
      <TableWrapper>
        <Table aria-label="Daftar pengajuan cuti">
          <TableHeader>
            <TableRow>
              <TableHead>Tipe</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead numeric>Durasi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Alasan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    {leaveTypeLabel(r.leave_type)}
                    {isUrgent(r.start_date, r.status) && <UrgencyBadge />}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-text-secondary">
                  {formatRange(r.start_date, r.end_date)}
                </TableCell>
                <TableCell numeric className="tnum">
                  {r.total_days !== null && r.total_days !== undefined ? `${r.total_days} hari` : "—"}
                </TableCell>
                <TableCell>
                  <LeaveStatusBadge status={r.status} />
                  {r.status === "rejected" && r.rejection_reason && (
                    <span className="mt-1 block max-w-48 text-xs text-text-tertiary">
                      {r.rejection_reason}
                    </span>
                  )}
                </TableCell>
                <TableCell className="max-w-56 truncate text-text-secondary" title={r.reason ?? ""}>
                  {r.reason ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableWrapper>
    </Card>
  );
}

/* ---------------- Halaman ---------------- */

export default function CutiPage() {
  const { user, hasRole } = useAuth();
  const canApprove = hasRole(...APPROVER_ROLES);
  const employeeId = user?.employee?.id ?? null;

  const [tab, setTab] = React.useState("pengajuan");
  const [applyOpen, setApplyOpen] = React.useState(false);

  const {
    data: balanceData,
    error: balanceError,
    loading: balanceLoading,
    reload: reloadBalances,
  } = useApi<unknown>(() => api.get("/leave-balances/me"));
  const balances = asList<LeaveBalance>(balanceData);

  const {
    data: typeData,
    loading: typesLoading,
  } = useApi<unknown>(() => api.get("/settings/leave-types").catch(() => []));
  const leaveTypes = asList<LeaveTypeSetting>(typeData);

  const {
    data: requestData,
    error: requestError,
    loading: requestsLoading,
    reload: reloadRequests,
  } = useApi<unknown>(
    () =>
      api.get("/leave-requests", {
        query: { employee_id: employeeId ?? undefined, per_page: 100 },
      }),
    [employeeId],
  );
  const myRequests = React.useMemo(
    () =>
      asList<LeaveRequest>(requestData).sort((a, b) =>
        (b.created_at ?? "").localeCompare(a.created_at ?? ""),
      ),
    [requestData],
  );

  const pending = myRequests.filter((r) => r.status === "pending");
  const history = myRequests.filter((r) => r.status !== "pending");

  const tabs = React.useMemo(() => {
    const t = [
      { value: "pengajuan", label: "Pengajuan saya" },
      { value: "riwayat", label: "Riwayat" },
      { value: "kalender", label: "Kalender tim" },
    ];
    if (canApprove) t.push({ value: "persetujuan", label: "Persetujuan" });
    return t;
  }, [canApprove]);

  function handleSaved() {
    reloadRequests();
    reloadBalances();
  }

  return (
    <div>
      <PageHeader
        title="Cuti"
        description="Kelola saldo, pengajuan, dan persetujuan cuti."
        actions={
          <Button onClick={() => setApplyOpen(true)}>
            <CalendarPlus className="h-4 w-4" aria-hidden />
            Ajukan cuti
          </Button>
        }
      />

      {balanceError ? (
        <div className="mb-6">
          <ErrorBlock message={balanceError} onRetry={reloadBalances} />
        </div>
      ) : (
        <div className="mb-6">
          <BalanceCards balances={balances} loading={balanceLoading} />
        </div>
      )}

      {requestError ? (
        <ErrorBlock message={requestError} onRetry={reloadRequests} />
      ) : requestsLoading ? (
        <Card className="p-0">
          <div className="space-y-2 p-5" role="status" aria-label="Memuat pengajuan cuti">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} shape="text" className="w-full" />
            ))}
          </div>
        </Card>
      ) : (
        <Tabs tabs={tabs} value={tab} onChange={setTab} label="Cuti">
          {(value) => (
            <>
              {value === "pengajuan" && (
                <RequestTable
                  items={pending}
                  emptyTitle="Tidak ada pengajuan aktif"
                  emptyDescription="Pengajuan cuti yang menunggu persetujuan akan tampil di sini."
                />
              )}
              {value === "riwayat" && (
                <RequestTable
                  items={history}
                  emptyTitle="Belum ada riwayat cuti"
                  emptyDescription="Pengajuan yang sudah disetujui atau ditolak akan tampil di sini."
                />
              )}
              {value === "kalender" && <TeamCalendar />}
              {value === "persetujuan" && canApprove && <ApprovalQueue />}
            </>
          )}
        </Tabs>
      )}

      <ApplyDialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        onSaved={handleSaved}
        balances={balances}
        leaveTypes={typesLoading ? [] : leaveTypes}
        existing={myRequests}
        employeeId={employeeId}
      />
    </div>
  );
}
