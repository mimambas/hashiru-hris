"use client";

import * as React from "react";
import { CalendarClock, ClipboardEdit } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth, type Role } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
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
import { ManualDialog } from "./_components/ManualDialog";
import { TeamGrid } from "./_components/TeamGrid";
import { TodayCard } from "./_components/TodayCard";
import {
  AttendanceBadge,
  ErrorBlock,
  addDays,
  formatTime,
  toISODate,
} from "./_components/helpers";
import type { AttendanceRecord } from "./_components/types";

const HR_ROLES: Role[] = ["super_admin", "hr_director", "hr_manager", "hr_officer"];
const MANAGER_ROLES: Role[] = [...HR_ROLES, "dept_manager", "team_leader"];

const STATUS_FILTER = [
  { value: "", label: "Semua status" },
  { value: "present", label: "Hadir" },
  { value: "late", label: "Terlambat" },
  { value: "early_leave", label: "Pulang cepat" },
  { value: "absent", label: "Absen" },
  { value: "wfh", label: "WFH" },
  { value: "leave", label: "Cuti" },
];

function asList(res: unknown): AttendanceRecord[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as AttendanceRecord[];
  const items = (res as { items?: AttendanceRecord[] }).items;
  return items ?? [];
}

/* ---------------- Riwayat pribadi ---------------- */

function PersonalHistory() {
  const defaultTo = React.useMemo(() => toISODate(new Date()), []);
  const defaultFrom = React.useMemo(() => addDays(defaultTo, -30), [defaultTo]);
  const [from, setFrom] = React.useState(defaultFrom);
  const [to, setTo] = React.useState(defaultTo);
  const [status, setStatus] = React.useState("");

  const { data, error, loading, reload } = useApi<unknown>(
    () =>
      api.get("/attendance", {
        query: { from, to, status: status || undefined, per_page: 100 },
      }),
    [from, to, status],
  );

  const items = asList(data);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-end justify-between gap-3">
        <CardTitle>Riwayat absensi saya</CardTitle>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="hist-from" className="mb-1.5 text-xs">Dari</Label>
            <Input id="hist-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label htmlFor="hist-to" className="mb-1.5 text-xs">Sampai</Label>
            <Input id="hist-to" type="date" value={to} min={from} max={defaultTo} onChange={(e) => setTo(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label htmlFor="hist-status" className="mb-1.5 text-xs">Status</Label>
            <Select id="hist-status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9">
              {STATUS_FILTER.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2" role="status" aria-label="Memuat riwayat absensi">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} shape="text" className="w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorBlock message={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-6 w-6" aria-hidden />}
            title="Belum ada riwayat absensi"
            description="Riwayat kehadiran pada rentang tanggal ini akan tampil di sini."
          />
        ) : (
          <TableWrapper>
            <Table aria-label="Riwayat absensi pribadi">
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jam masuk</TableHead>
                  <TableHead>Jam keluar</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead numeric>Telat (mnt)</TableHead>
                  <TableHead numeric>Lembur (jam)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r, i) => (
                  <TableRow key={String(r.id ?? i)}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(r.date ?? r.check_in)}
                    </TableCell>
                    <TableCell className="tnum">{formatTime(r.check_in)}</TableCell>
                    <TableCell className="tnum">{formatTime(r.check_out)}</TableCell>
                    <TableCell>
                      <AttendanceBadge status={r.status} />
                      {r.source === "manual" && (
                        <span className="ml-2 text-xs text-text-tertiary">(manual)</span>
                      )}
                    </TableCell>
                    <TableCell numeric className="tnum">
                      {r.late_minutes !== null && r.late_minutes !== undefined ? r.late_minutes : "—"}
                    </TableCell>
                    <TableCell numeric className="tnum">
                      {r.overtime_hours !== null && r.overtime_hours !== undefined ? r.overtime_hours : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Halaman ---------------- */

export default function AbsensiPage() {
  const { hasRole } = useAuth();
  const isHr = hasRole(...HR_ROLES);
  const canSeeTeam = hasRole(...MANAGER_ROLES);
  const [tab, setTab] = React.useState("saya");
  const [manualOpen, setManualOpen] = React.useState(false);
  const [historyKey, setHistoryKey] = React.useState(0);

  const tabs = React.useMemo(() => {
    const t = [{ value: "saya", label: "Absensi saya" }];
    if (canSeeTeam) t.push({ value: "tim", label: "Ringkasan tim" });
    return t;
  }, [canSeeTeam]);

  return (
    <div>
      <PageHeader
        title="Absensi"
        description="Catat kehadiran harian dan pantau riwayat absensi."
        actions={
          isHr ? (
            <Button variant="outline" onClick={() => setManualOpen(true)}>
              <ClipboardEdit className="h-4 w-4" aria-hidden />
              Input manual
            </Button>
          ) : undefined
        }
      />

      <Tabs tabs={tabs} value={tab} onChange={setTab} label="Absensi">
        {(value) => (
          <>
            {value === "saya" && (
              <div className="space-y-4">
                <TodayCard />
                <div key={historyKey}>
                  <PersonalHistory />
                </div>
              </div>
            )}
            {value === "tim" && canSeeTeam && <TeamGrid />}
          </>
        )}
      </Tabs>

      {isHr && (
        <ManualDialog
          open={manualOpen}
          onClose={() => setManualOpen(false)}
          onSaved={() => setHistoryKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
