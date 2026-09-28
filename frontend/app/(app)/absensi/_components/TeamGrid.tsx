"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/format";
import { cx } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/Table";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  ATTENDANCE_META,
  ErrorBlock,
  addDays,
  attendanceMeta,
  dateRange,
  toISODate,
} from "./helpers";
import type { TeamMember } from "./types";

/* ---------------- Normalisasi respons tim ---------------- */

function normalizeTeam(res: unknown): TeamMember[] {
  const list: unknown[] = Array.isArray(res)
    ? res
    : ((res as { items?: unknown[] } | null)?.items ?? []);
  const members: TeamMember[] = [];
  for (const row of list) {
    const r = row as Record<string, unknown>;
    const emp = (r.employee ?? r) as Record<string, unknown>;
    const id = String(emp.id ?? r.employee_id ?? "");
    if (!id) continue;
    const days: Record<string, string | null> = {};
    const push = (date: unknown, status: unknown) => {
      const d = String(date ?? "").slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) days[d] = status == null ? null : String(status);
    };
    const records = r.records ?? r.days ?? r.attendance;
    if (Array.isArray(records)) {
      for (const rec of records as Array<Record<string, unknown>>) {
        push(rec.date ?? rec.day, rec.status);
      }
    } else if (records && typeof records === "object") {
      for (const [d, s] of Object.entries(records as Record<string, unknown>)) push(d, s);
    } else {
      push(r.date, r.status);
    }
    members.push({
      employee: {
        id,
        full_name: String(emp.full_name ?? emp.name ?? "—"),
        employee_id: emp.employee_id ? String(emp.employee_id) : undefined,
        photo_url: (emp.photo_url as string | null | undefined) ?? null,
      },
      days,
    });
  }
  // Gabungkan baris ganda untuk karyawan yang sama.
  const merged = new Map<string, TeamMember>();
  for (const m of members) {
    const prev = merged.get(m.employee.id);
    if (prev) Object.assign(prev.days, m.days);
    else merged.set(m.employee.id, m);
  }
  return Array.from(merged.values());
}

/* ---------------- Ekspor CSV ---------------- */

function exportCsv(members: TeamMember[], dates: string[]) {
  const header = ["Nama", "ID karyawan", ...dates.map((d) => formatDate(d))];
  const lines = [header];
  for (const m of members) {
    lines.push([
      m.employee.full_name,
      m.employee.employee_id ?? "",
      ...dates.map((d) => attendanceMeta(m.days[d]).label),
    ]);
  }
  const csv = lines
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ringkasan-absensi-${dates[0]}_${dates[dates.length - 1]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------------- Grid ---------------- */

const LEGEND_KEYS = ["present", "late", "absent", "wfh", "leave"] as const;

export function TeamGrid() {
  const defaultTo = React.useMemo(() => toISODate(new Date()), []);
  const defaultFrom = React.useMemo(() => addDays(defaultTo, -6), [defaultTo]);
  const [from, setFrom] = React.useState(defaultFrom);
  const [to, setTo] = React.useState(defaultTo);

  const dates = React.useMemo(
    () => (from && to && from <= to ? dateRange(from, to) : []),
    [from, to],
  );

  const { data, error, loading, reload } = useApi<unknown>(
    () => api.get("/attendance/team", { query: { from, to } }),
    [from, to],
  );

  const members = React.useMemo(() => normalizeTeam(data), [data]);

  const summary = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of members) {
      for (const d of dates) {
        const key = (m.days[d] ?? "").toLowerCase();
        if (key) counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    return counts;
  }, [members, dates]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="team-from" className="mb-1.5">Dari tanggal</Label>
          <Input
            id="team-from"
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="team-to" className="mb-1.5">Sampai tanggal</Label>
          <Input
            id="team-to"
            type="date"
            value={to}
            min={from}
            max={defaultTo}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => members.length > 0 && exportCsv(members, dates)}
          disabled={members.length === 0}
          className="mb-0.5"
        >
          <Download className="h-4 w-4" aria-hidden />
          Ekspor CSV
        </Button>

        {/* Legenda */}
        <div className="mb-1 ml-auto flex flex-wrap items-center gap-2" aria-label="Legenda status">
          {LEGEND_KEYS.map((key) => {
            const meta = ATTENDANCE_META[key];
            return (
              <span key={key} className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span
                  aria-hidden
                  className={cx(
                    "flex h-5 w-7 items-center justify-center rounded text-[10px] font-bold",
                    meta.cellClass,
                  )}
                >
                  {meta.code}
                </span>
                {meta.label}
              </span>
            );
          })}
        </div>
      </div>

      {loading ? (
        <Card className="p-0">
          <div className="space-y-2 p-5" role="status" aria-label="Memuat ringkasan tim">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} shape="text" className="w-full" />
            ))}
          </div>
        </Card>
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : members.length === 0 || dates.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            title="Belum ada data ringkasan"
            description="Pilih rentang tanggal untuk melihat ringkasan kehadiran tim."
          />
        </Card>
      ) : (
        <>
          <Card className="p-0">
            <TableWrapper>
              <Table aria-label="Ringkasan absensi tim">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 min-w-48 bg-surface shadow-[1px_0_0_var(--border)]">
                      Karyawan
                    </TableHead>
                    {dates.map((d) => (
                      <TableHead key={d} className="min-w-14 text-center">
                        <span className="block text-[11px] font-semibold">{d.slice(8, 10)}</span>
                        <span className="block text-[10px] font-normal">{formatDate(d).split(" ")[1]}</span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.employee.id}>
                      <TableCell className="sticky left-0 z-10 bg-surface shadow-[1px_0_0_var(--border)]">
                        <span className="flex items-center gap-2">
                          <Avatar name={m.employee.full_name} src={m.employee.photo_url} size="sm" />
                          <span className="max-w-36 truncate text-[13px] font-medium">
                            {m.employee.full_name}
                          </span>
                        </span>
                      </TableCell>
                      {dates.map((d) => {
                        const meta = attendanceMeta(m.days[d]);
                        return (
                          <TableCell key={d} className="p-1 text-center">
                            <Tooltip content={`${m.employee.full_name} · ${formatDate(d)}: ${meta.label}`}>
                              <span
                                className={cx(
                                  "mx-auto flex h-7 w-9 items-center justify-center rounded-control text-[11px] font-bold",
                                  meta.cellClass,
                                )}
                                role="img"
                                aria-label={`${formatDate(d)}: ${meta.label}`}
                              >
                                {meta.code}
                              </span>
                            </Tooltip>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          </Card>

          {/* Ringkasan angka */}
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Total per status">
            {LEGEND_KEYS.map((key) => {
              const meta = ATTENDANCE_META[key];
              return (
                <span
                  key={key}
                  className="tnum rounded-full bg-muted px-3 py-1 text-xs text-text-secondary"
                >
                  {meta.label}: <strong className="text-text">{summary[key] ?? 0}</strong>
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
